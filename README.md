# calendar_heatmap
flexible D3 calendar heatmaps a la GitHub contribution graphs

(include an image)

## including in your project
If you're using node, you can `npm install madams1/calendar_heatmap` and then `var calendar_heatmap = require(calendar_heatmap);` to use it however you'd like.

Otherwise you can just put the bundled JS in your HTML. `<script src="calendar_heatmap.min.js"></script>` and carry on.

## usage

To create the default, barebones calendar_heatmap from your data, you might do something like:

```javascript
calendar_heatmap.create({
    data: my_data,
    date_var: "day",
    fill_var: "count"
});
```

calendar_heatmap exposes a `create` method that's used to make the actual chart, as well as a `brewer` object that includes <a href="http://colorbrewer2.org" target="_blank">ColorBrewer</a> color palettes.

Your data is expected to be an array of objects representing days and corresponding measurements. It should probably look something like this:

```json
[
    { day: "2015-01-01", count: 100 },
    { day: "2015-01-02", count: 101 },
    { day: "2015-01-03", count: 102 }
]
```

_Note_: You probably want at least a few months of data to make this type of visualization...

Another example:
```javascript
d3.json("my_data.json", function(err, dat) {
    calendar_heatmap.create({
        target: "#container",
        data: dat,
        date_var: "day",
        fill_var: "count",
        color_scheme: calendar_heatmap.brewer.YlGnBu,
        stroke_color: "whitesmoke",
        date_format: "%m-%d-%Y",
        missing_as_zero: true,
        title: "Daily Measurements of Something Interesting"
    });
});
```
Take a look at the <a href="https://github.com/madams1/calendar_heatmap/wiki" target="_blank">wiki</a> for the full breakdown of available options.

## features
- handles data with missing and unordered dates gracefully
- custom color scales
- choose start of week to be either Monday (default) or Sunday
- option to exclude weekends
- option to count missing data as 0's
- continuous legend included
- smart tooltips
- layout toggle to dynamically adjust layout

## dependencies
- D3.js
- lodash
- moment
- colorbrewer
