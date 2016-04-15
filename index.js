// load dependencies
var _ = require("lodash"),
    d3 = require("d3"),
    moment = require("moment"),
    color_ramps = require("color_ramps");

// object to attach things to
var calendar_heatmap = {};

// expose color ramps
calendar_heatmap.color_ramps = color_ramps;

calendar_heatmap.create = function(opts) {

    //// utility methods to move DOM node to front/back
    d3.selection.prototype.moveToFront = function() {
        return this.each(function() {
            this.parentNode.appendChild(this);
      });
    };

    d3.selection.prototype.moveToBack = function() {
        return this.each(function() {
            var firstChild = this.parentNode.firstChild;
            if (firstChild) {
                this.parentNode.insertBefore(this, firstChild);
            }
        });
    };

    // reconciliation
    if (opts.sunday_start && opts.weekdays_only) {
        opts.sunday_start = false;
    };

    //// options to use for calendar heatmap

    var options = {
        //// initial
        data: opts.data, // required
        date_var: opts.date_var, // required
        fill_var: opts.fill_var, // required
        target: opts.target ? opts.target : "body",
        //// data
        date_format: opts.date_format ? opts.date_format : "%Y-%m-%d",
        missing_as_zero: opts.missing_as_zero ? opts.missing_as_zero : false,
        sunday_start: opts.sunday_start ? opts.sunday_start : false,
        weekdays_only: opts.weekdays_only ? opts.weekdays_only : false,
        numeric_format: opts.numeric_format ? opts.numeric_format : ",",
        round: opts.round ? opts.round : 1,
        fill_extent: opts.fill_extent ? opts.fill_extent : null,
        //// tiles
        tile_width: opts.tile_width ? opts.tile_width : 15,
        tile_height: opts.tile_height ? opts.tile_height : 14,
        color_scheme: opts.color_scheme ? opts.color_scheme : calendar_heatmap.color_ramps.YlOrBr,
        missing_color: opts.missing_color ? opts.missing_color : "#ddd",
        stroke_color: opts.stroke_color ? opts.stroke_color : "#fff",
        discrete_scale: opts.discrete_scale ? opts.discrete_scale : false,
        num_colors: opts.num_colors ? opts.num_colors : null,
        on_click: opts.on_click ? opts.on_click : null,
        //// labels/legend
        title: opts.title ? opts.title : "",
        title_size: opts.title_size ? opts.title_size : 18,
        unselected_color: opts.unselected_color ? opts.unselected_color : "#999",
        abbr_weekdays: opts.abbr_weekdays ? opts.abbr_weekdays : false,
        show_tooltip: _.isUndefined(opts.show_tooltip) ? true : opts.show_legend,
        tooltip_width: opts.tooltip_width ? opts.tooltip_width : 170,
        simple_tooltip: opts.simple_tooltip ? opts.simple_tooltip : false,
        show_legend: _.isUndefined(opts.show_legend) ? true : opts.show_legend,
        legend_title: opts.legend_title ? opts.legend_title : null,
        //// miscellaneous
        accent_color: opts.accent_color ? opts.accent_color : "#333",
        show_toggle: _.isUndefined(opts.show_toggle) ? true : opts.show_toggle,
        margin_top: opts.margin_top ? opts.margin_top : 50,
        margin_bottom: opts.margin_bottom ? opts.margin_bottom : 10,
        margin_left: opts.margin_left ? opts.margin_left : (opts.abbr_weekdays ? 40 : 80),
        margin_right: opts.margin_right ? opts.margin_right : 10,
    };

    //// handle data

    // convert dates to moments and fill_values to numeric
    _.map(options.data, function(x) {
        var date_string = d3.time.format(options.date_format).parse(x[options.date_var]);

        x[options.date_var] = moment(date_string);
        x[options.fill_var] = +x[options.fill_var];
    });

    var dates = _.map(options.data, options.date_var).sort(d3.ascending);

    var first_dow = moment(dates[0]).weekday(),
        day_extent = d3.extent(dates),
        num_days = moment(day_extent[1]).diff(moment(day_extent[0]), "days") + 1;

    var days_of_week = _.map(options.weekdays_only ? d3.range(5) : d3.range(7), function(d) {
        return (options.sunday_start ? moment().day(d).format(options.abbr_weekdays ? "dd" : "dddd") :
            moment().isoWeekday(d + 1).format(options.abbr_weekdays ? "dd" : "dddd"));
    });

    var first_month = day_extent[0].month(),
        num_months = day_extent[1].diff(day_extent[0], "months");

    var months = _.map(d3.range(first_month, first_month + num_months + 1), function(m) {
        return moment().month(m).format("MMM");
    });

    // create calendar domain
    var calendar_domain = [];

    for (var i = 0; i < num_days; i++) {
        var day = {
            day: moment(dates[0]).add(i, "days")
        };
        calendar_domain.push(day);
    }

    //// extend calendar domain with input data to get dataset with missing values

    // counters for relative date interval numbers
    var wn = 0, // relative week number
        mn = 0, // relative month number
        wn_in_mo = 1; // relative week number in month

    var months_and_weeks = [];

    options.data = _.forEach(calendar_domain, function(d) {

        d.dom = d.day.date() - 1;
        d.dow = options.sunday_start ?
            d.day.weekday() :
            d.day.isoWeekday() - 1;
        d.formatted_date = d.day.format("dddd MMM DD, YYYY");

        // at the start of every week, count a new week and new week within current month
        if (d.dow === 0) {
            wn += 1;
            wn_in_mo += 1;
        }

        d.week_number = wn;

        // copy of this day's moment to do math on without changing the actual date
        var day_copy = moment(JSON.parse(JSON.stringify(d))),
            month_week_data;

        // at the start of every month (after the first month), count a new month
        if (d.dom === 0 && wn > 0) {
            mn += 1;

            month_week_data = {
                month_number: mn - 1,
                label: months[mn - 1],
                weeks: (day_copy.add(-1, "day").weekday() === 0 ? (wn_in_mo - 1) : wn_in_mo),
                week_number: (day_copy.add(-1, "day").weekday() === 6 ? (wn - 1) : wn)
            };

            months_and_weeks.push(month_week_data);
            wn_in_mo = 1; // reset counter each month
        }

        d.month_number = mn;

        if (d.day.valueOf() === day_extent[1].valueOf()) {
            month_week_data = {
                month_number: mn,
                label: months[mn],
                weeks: (moment(d.day).add(-1, "day").weekday() === 0 ? (wn_in_mo - 1) : wn_in_mo),
                week_number: (moment(d.day).add(-1, "day").weekday() === 0 ? (wn - 1) : wn)
            };

            months_and_weeks.push(month_week_data);
        }

        // join input data on date-domain data
        _.extend(d, _.find(options.data, function(x) {
            return x[options.date_var].valueOf() === d.day.valueOf();
        }));
    });

    // should missing data be counted as 0's
    _.map(options.data, function(d) {
        if (options.missing_as_zero && _.isUndefined(d[options.fill_var])) {
            d[options.fill_var] = 0;
        }
    });

    // only display weekdays
    if (options.weekdays_only) {
        options.data = _.filter(options.data, function(d) {
            return d.day.isoWeekday() < 6;
        });
    }

    //////////////////// constant across multiples

    // data-related summary values
    var fill_extent = options.fill_extent ?
        options.fill_extent :
        d3.extent(_.map(options.data, options.fill_var));

    var min_val = fill_extent[0],
        max_val = fill_extent[1];

    // color scheming
    var color_opt = _.isArray(options.color_scheme) ? options.color_scheme.length : (options.num_color ? options.num_color :
        _.keys(options.color_scheme).slice(-1)[0]);

    var palette = _.isArray(options.color_scheme) ? options.color_scheme : options.color_scheme[color_opt],
        color_domain = d3.range(min_val, max_val + (max_val - min_val)/(color_opt - 1), (max_val - min_val)/(color_opt - 1));

    if (options.discrete_scale) {
        var color_scale = d3.scale.quantize()
            .domain(fill_extent)
            .range(palette);
    } else {
        var color_scale = d3.scale.linear()
            .domain(color_domain)
            .range(palette);
    }

    // add color to data
    _.map(options.data, function(d) {
        d.fill_color = d[options.fill_var] ? color_scale(d[options.fill_var]) : options.missing_color;
    });

    // margins and sizes
    var margin = {
        top: options.margin_top,
        bottom: options.margin_bottom,
        left: options.margin_left,
        right: options.margin_right
    };

    var tile_width = options.tile_width,
        tile_height = options.tile_height;

    var w = tile_width*(wn + mn + 1) + margin.left + margin.right,
        h = tile_height*(options.weekdays_only ? 5 : 7)*(options.show_legend ? 2 : 1.2) + margin.top + margin.bottom;

    // scales and axes
    var y_scale = d3.scale.ordinal()
        .domain(days_of_week)
        .rangeBands([0, (tile_height*(options.weekdays_only ? 5 : 7))]);

    var y_axis = d3.svg.axis()
        .scale(y_scale)
        .orient("left");

    //////////////////////
    var ch_id = _.uniqueId("ch_");

    // setup the svg
    var svg = d3.select(options.target)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("id", ch_id);

    // fade in
    svg.style("opacity", 0)
        .transition().duration(1300)
        .style("opacity", 1);

    // place title on chart
    svg.append("text")
        .attr("x", margin.left + tile_width/2)
        .attr("y", +(margin.top - (+options.title_size - 5)))
        .text(options.title)
        .style("font-size", options.title_size + "px")
        .style("font-weight", 800)
        .attr("fill", options.accent_color);

    // place y axis on chart
    svg.append("g")
        .classed("y axis", true)
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")")
        .call(y_axis);

    // don't show axis lines
    d3.selectAll(".axis path, .yaxis line")
        .style("fill", "none");

    var y_ticks = d3.selectAll("#" + ch_id + " .y .tick")[0];

    d3.selectAll(y_ticks)
        .style("font-size", "11px")
        .attr("fill", options.accent_color);

    // configure month labels
    var month_labels;

    function drawMonthLabels() {
        // place month labels on chart
        month_labels = svg.append("g")
            .attr("transform", "translate(" + margin.left + ", " + (tile_height*(options.weekdays_only ? 5 : 7) + margin.top + 12) + ")")
            .moveToBack();

        month_labels.selectAll("text")
            .data(months_and_weeks)
            .enter()
            .append("text")
            .attr("x", function(d) {
                return (d.week_number)*tile_width + (d.month_number)*tile_width - ((d.weeks - 1)*tile_width) + (d.weeks - 1)*tile_width/2 - 2;
            })
            .attr("y", 0)
            .attr("fill", options.accent_color)
            .text(function(d) { return d.label; })
            .attr("style", "font-size: 11px")
            .style("opacity", 0)
            .transition()
            .delay(600)
            .duration(1200)
            .style("opacity", 1);
    }

    // configure layout toggle
    if (options.show_toggle) {
        var toggle_width = 110;

        var layout_toggle = svg.append("g")
            .attr("transform", "translate(" + (tile_width*(wn + 0.5) + margin.left - toggle_width) + ", " + (margin.top - 32) + ")")
            .attr("style", "font-size: 12px; cursor: pointer");

        var toggle_shape = layout_toggle.append("rect")
            .attr("width", toggle_width)
            .attr("height", 20)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("stroke", "#bbb")
            .attr("fill", "#eee");

        var toggle_text = layout_toggle.append("text")
            .attr("x", 11)
            .attr("y", 14)
            .attr("fill", options.accent_color)
            .text("expand months »");
    }

    // start making some tiles
    var tile_group = svg.append("g");

    var tiles = tile_group.selectAll("rect")
        .data(options.data)
        .enter()
        .append("rect")
        .attr("x", function(d) {
          return d.week_number*tile_width + margin.left;
        })
        .attr("y", function(d) {
            return d.dow*tile_height + margin.top;
        })
        .attr("rx", 1)
        .attr("width", tile_width)
        .attr("height", tile_height)
        .attr("fill", function(d) {
            return _.isUndefined(d[options.fill_var]) ?
                options.missing_color :
                color_scale(d[options.fill_var]);
        })
        .attr("stroke-width", 1.5)
        .attr("stroke", options.stroke_color);

    // configure legend
    function drawLegend() {
        var leg_width = 150,
            y_pos = tile_height*(options.weekdays_only ? 5 : 7) + 48 + margin.top;

        var legend_group = svg.append("g")
            .classed("legend", true);

        var legend = legend_group.append("defs")
            .append("linearGradient")
            .attr("id", "legend_gradient");

        _.forEach(palette, function(c, i) {
            legend.append("stop")
                .attr("offset", i*(100/(color_opt - 1)) + "%")
                .attr("stop-color", c);
        });

        legend_group.append("rect")
            .attr("x", margin.left + tile_width/2)
            .attr("y", y_pos)
            .attr("width", leg_width)
            .attr("height", 12)
            .attr("fill", "url(#legend_gradient)");

        legend_group.append("text")
            .attr("text-anchor", "start")
            .text(options.legend_title ? options.legend_title : options.fill_var)
            .attr("x", margin.left + tile_width/2)
            .attr("y", y_pos - 7)
            .attr("style", "font-size: 12px; font-weight: 600")
            .attr("fill", options.accent_color);

        legend_group.append("text")
            .attr("text-anchor", "middle")
            .text(d3.format(options.numeric_format)(d3.round(min_val, options.round)))
            .attr("x", margin.left + tile_width/2)
            .attr("y", y_pos + 25)
            .style("font-size", "11px")
            .attr("fill", options.accent_color);

        legend_group.append("text")
            .attr("text-anchor", "middle")
            .text(d3.format(options.numeric_format)(d3.round(max_val, options.round)))
            .attr("x", margin.left + leg_width + tile_width/2)
            .attr("y", y_pos + 25)
            .style("font-size", "11px")
            .attr("fill", options.accent_color);
    }

    if (options.show_legend) {
        drawLegend();
    }

    //// toggle the layout of months

    // initial layout of months
    var months_expanded = false;
    var tiles_width = tile_width*(wn + 1);

    function expandMonths() {
        tiles_width = tile_width*(wn + mn + 1);

        drawMonthLabels();

        layout_toggle.style("pointer-events", "none")
            .transition()
            .delay(1/(mn + 5)*500)
            .duration(1000)
            .attr("transform", "translate(" + (tile_width*(wn + mn + 0.5) + margin.left - toggle_width) + ", " + (margin.top - 32) + ")")
            // prevent multiple clicks before layout is finished transitioning
            .each("end", function() {
                d3.select(this).style("pointer-events", "auto");
            });

        toggle_text.transition()
            .attr("x", 8)
            .delay(1/(mn + 5)*500)
            .duration(1000)
            .text("« collapse months");

        tiles.style("pointer-events", "none")
            .transition()
            .delay(function(d) {
                return 1/(d.month_number + 5)*500;
            })
            .duration(1000)
            .attr("x", function(d) {
                return d.week_number*tile_width + d.month_number*tile_width + margin.left;
            })
            // suppress mouseover events until (just after) transition is finished
            .each("end", function(d, i) {
                var this_tile = this;
                setTimeout(function() { d3.select(this_tile).style("pointer-events", "auto"); }, 300);
            });

        months_expanded = true;
    }

    function collapseMonths() {
        tiles_width = tile_width*(wn + 1);

        month_labels.transition()
            // .delay(100)
            .duration(400)
            .style("opacity", 0)
            .remove();

        layout_toggle.style("pointer-events", "none")
            .transition()
            .delay(1/(mn + 5)*500)
            .duration(1000)
            .attr("transform", "translate(" + (tile_width*(wn + 0.5) + margin.left - toggle_width) + ", " + (margin.top - 32) + ")")
            // prevent multiple clicks before layout is finished transitioning
            .each("end", function() {
                d3.select(this).style("pointer-events", "auto");
            });

        toggle_text.transition()
            .attr("x", 11)
            .delay(1/(mn + 5)*500)
            .duration(1000)
            .text("expand months »");

        tiles.style("pointer-events", "none")
            .transition()
            .delay(function(d) {
                return 1/(d.month_number + 5)*500;
            })
            .duration(1000)
            .attr("x", function(d) {
                return d.week_number*tile_width + margin.left;
            })
            // suppress mouseover events until transition is finished
            .each("end", function(d, i) {
                d3.select(this).style("pointer-events", "auto");
            });
        months_expanded = false;
    }

    //// handle layout toggle button events
    if (options.show_toggle) {
        layout_toggle
            // mouseover
            .on("mouseover", function() {
                toggle_shape.transition()
                    .duration(100)
                    .attr("fill", "#ddd");
            })
            // mouseout
            .on("mouseout", function() {
                toggle_shape.transition()
                    .duration(100)
                    .attr("fill", "#eee");
            })
            // click
            .on("click", function(d) {
                months_expanded ? collapseMonths() : expandMonths();
                toggle_shape.transition()
                    .duration(100)
                    .attr("fill", "#eee");

            });
    }

    //// handle mouseover events

    // reference to month label text
    var month_label_text,
        this_tile;

    tiles
        // mouseover
        .on("mouseover", function(d) {

        this_tile = d3.select(this);

        this_tile
            .moveToFront()
            .attr("stroke-width", 2.5)
            .attr("stroke", options.accent_color)
            .transition().duration(100)
            .attr("height", tile_height*0.75)
            .transition().duration(100)
            .attr("height", tile_height);

        // tooltipping
        if (options.show_tooltip) {
            var tiles_height = (options.weekdays_only ? 5 : 7)*tile_height,
                tt_val_text = (options.legend_title ? options.legend_title : options.fill_var) + ": " +
                    (_.isUndefined(d[options.fill_var]) ? "N/A" :
                    d3.format(options.numeric_format)(d3.round(d[options.fill_var], options.round)));
            if (!options.simple_tooltip) {
                var tt_height = 60;

                var tt_below_pos = +this_tile.attr("y") + tile_height + 7 + tt_height,
                    tt_above_pos = +this_tile.attr("y") - 7 - tt_height;

                var flip_tt_up = tt_below_pos >= tiles_height + margin.top + tile_height*2,
                    slide_tt_right = +this_tile.attr("x") + tile_width/2 - options.tooltip_width/2 <= margin.left,
                    slide_tt_left = +this_tile.attr("x") + tile_width/2 + options.tooltip_width/2 - margin.left >= tiles_width;

                var slide_right_pos = +this_tile.attr("x") - (+this_tile.attr("x") - margin.left) + 7,
                    slide_left_pos =  margin.left - options.tooltip_width + tiles_width - 7;
                var tt_x_pos = +this_tile.attr("x") - (options.tooltip_width - tile_width)/2;

                this_tile.tt_group = tile_group.append("g")
                    .attr("transform", "translate(" + (slide_tt_right ? slide_right_pos :
                        (slide_tt_left ? slide_left_pos : tt_x_pos)) +
                        ", " + (flip_tt_up ? tt_above_pos : (tt_below_pos - tt_height)) + ")");

                this_tile.tt_group.append("rect")
                    .attr("width", options.tooltip_width)
                    .attr("height", tt_height)
                    .attr("rx", 2)
                    .attr("ry", 2)
                    .style("fill", "#333");

                this_tile.tt_group.append("text")
                            .text(tt_val_text)
                            .style("font-size", "14px")
                            .style("font-weight", 700)
                            .attr("text-anchor", "middle")
                            .attr("x", options.tooltip_width/2)
                            .attr("y", tt_height/2 - 10)
                            .attr("fill", "#eee");

                this_tile.tt_group.append("text")
                    .text(d.formatted_date)
                    .style("font-size", "13px")
                    .attr("text-anchor", "middle")
                    .attr("x", options.tooltip_width/2)
                    .attr("y", tt_height/2 + 16)
                    .attr("fill", "#eee");

                this_tile.tt_group.style("opacity", 0)
                        .transition().delay(200).duration(200)
                        .style("opacity", 0.9);
            } else {
                this_tile.tt_group = svg.append("g")
                    .attr("transform", "translate(" + (tiles_width + margin.left - tile_width/2) + ", " + (margin.top + tiles_height + (months_expanded ? 30 : 15)) + ")")
                    .append("text")
                    .attr("text-anchor", "end")
                    .text(tt_val_text + " on " + d.day.format("ddd MMM DD, YYYY"))
                    .style("font-size", "12px");

                this_tile.tt_group.style("opacity", 0)
                        .transition().delay(200).duration(200)
                        .style("opacity", 0.9);
            }

        }

        //// fade/highlight labels
        if (months_expanded) {
            month_label_text = month_labels.selectAll("text")[0];
            var this_month = _.map(_.filter(months_and_weeks, { month_number: d.month_number }), "month_number")[0];

            // fade unselected month labels
            d3.selectAll(_.xor(month_label_text, [month_label_text[this_month]]))
                .transition().duration(400).attr("fill", options.unselected_color);

            // highlight selected month label
            d3.select(month_label_text[this_month])
                .transition().duration(400).attr("fill", options.accent_color);

        }

        // fade unselected y tick labels
        d3.selectAll(_.xor(y_ticks, [y_ticks[d.dow]]))
            .transition().duration(400).attr("fill", options.unselected_color);

        // highlight selected y tick label
        d3.select(y_ticks[d.dow])
            .transition().duration(400).attr("fill", options.accent_color);
    })
    // mouseout
    .on("mouseout", function(d) {

        this_tile.attr("stroke-width", 1.5)
            .attr("stroke", options.stroke_color);

        this_tile.tt_group.remove();
    });

    // click
    if (options.on_click) {
        tiles.on("click", options.on_click);
    }

    // return tick labels to default
    tile_group.on("mouseleave", function() {
        d3.selectAll(y_ticks)
            .transition().duration(400).attr("fill", options.accent_color);

        if (months_expanded) {
            d3.selectAll(month_label_text)
                .transition().duration(400).attr("fill", options.accent_color);
        }
    });
};

module.exports = calendar_heatmap;
