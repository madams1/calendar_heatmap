# calendar_heatmap
flexible D3 calendar heatmaps a la GitHub contribution calendars

![](img/calendar_heatmap_example.png)

## including in your project
Using node:

1. `npm install calendar_heatmap`
2. `var calendar_heatmap = require(calendar_heatmap);`


Otherwise you can just download the pre-bundled JS and include it in your HTML. `<script src="calendar_heatmap.bundle.js"></script>` and carry on.

## usage

To create the default, barebones calendar heatmap from your data, you might do something like:

```javascript
calendar_heatmap.create({
    data: my_data,
    date_var: "day",
    fill_var: "count"
});
```

Your data is expected to be an array of objects representing days and corresponding measurements. It should probably look something like this:

```json
[
    { day: "2015-01-01", count: 100 },
    { day: "2015-01-02", count: 101 },
    { day: "2015-01-03", count: 102 }
]
```

_Note_: You probably want the timeframe of your data to span somewhere between a couple months and a couple years to make this type of visualization. A year's worth of data might make the most sense...

For convenience, **calendar_heatmap** exposes a `color_ramps` object that includes <a href="https://github.com/madams1/color_ramps" target="_blank">color_ramps</a>.

Another example:
```javascript
d3.json("my_data.json", function(err, dat) {
    calendar_heatmap.create({
        target: "#container",
        data: dat,
        date_var: "day",
        fill_var: "count",
        color_scheme: calendar_heatmap.color_ramps.YlGnBu,
        stroke_color: "whitesmoke",
        date_format: "%m-%d-%Y",
        missing_as_zero: true,
        title: "Daily Measurements of Something Interesting"
    });
});
```
Take a look at the <a href="https://github.com/madams1/calendar_heatmap/wiki/Options" target="_blank">wiki</a> for the full breakdown of available options.

## examples

- <a href="http://bl.ocks.org/madams1/f68685a9f5f0a0b3f7ba" target="_blank">Single Example</a>
- <a href="http://bl.ocks.org/madams1/84f40b8d3148c6e67b32" target="_blank">Multiple Example</a>

## features
- handles data with missing and unordered dates gracefully
- custom color schemes (<a href="https://github.com/madams1/color_ramps" target="_blank">color_ramps</a> included)
- choose start of week to be either Monday (default) or Sunday
- option to exclude weekends
- option to count missing data as 0's
- choice of discrete (quantize) or continuous (linear) color scale
- smart tooltips
- layout toggle to dynamically adjust layout

## dependencies
- D3.js
- lodash
- moment
- color_ramps

## browser support
**calendar_heatmap** is tested to work in the latest stable releases of Chrome, Firefox, and Opera
