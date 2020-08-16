/*
*    main.js
*    Mastering Data Visualization with D3.js
*    CoinStats
*/

var margin = { left:80, right:100, top:50, bottom:100 },
    height = 500 - margin.top - margin.bottom,
    width = 800 - margin.left - margin.right;

var svg = d3.select("#chart-area").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

var g = svg.append("g")
    .attr("transform", "translate(" + margin.left +
        ", " + margin.top + ")");

var newData = {};
var coin = "bitcoin";
var value = "price_usd";
var textValue = "Price";

// Time parser for x-scale
var parseTime = d3.timeParse("%d/%m/%Y");
// For tooltip
var bisectDate = d3.bisector(function(d) { return d.date; }).left;

// Scales
var x_scale = d3.scaleTime().range([0, width]);
var y_scale = d3.scaleLinear().range([height, 0]);
var date_scale = d3.scaleTime()
    .domain([parseTime("12/05/2013"), parseTime("31/10/2017")])
    .range([0, width]);

// Axis generators
var xAxisCall = d3.axisBottom()
    .ticks(4);
var yAxisCall = d3.axisLeft()
    .ticks(10)
    .tickFormat(function(d) {
        return d3.format(".2s")(d).replace("G", "B").toUpperCase();
    }
  );

// Axis groups
var xAxis = g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")");
var yAxis = g.append("g")
    .attr("class", "y axis")

// X-Axis Label
xAxis.append("text")
		.attr("class", "x-axis-label")
		.attr("x", width / 2)
		.attr("y", margin.bottom / 2)
		.attr("font-size", "20px")
		.attr("text-anchor", "middle")
    .attr("fill", "#5D6971")
		.text("Time");

// Y-Axis label
var yLabel = yAxis.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2))
    .attr("y", -60)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("fill", "#5D6971")
    .text(textValue + " (USD)");

// Line path generator
var line = d3.line()
    .x(function(d) { return x_scale(d.date); })
    .y(function(d) { return y_scale(d[value]); });

d3.json("data/coins.json").then(function(data) {
    // Data cleaning
    for (const coin in data) {
        newData[coin] = data[coin].filter(function(d) {
            return (d["24h_vol"] && d.market_cap && d.price_usd);
        }).map(function(d) {
            var v = {};
            v["24h_vol"] = +d["24h_vol"];
            v.date = parseTime(d.date);
            v.market_cap = +d.market_cap;
            v.price_usd = +d.price_usd;
            return v;
        });
    }

    update(newData[coin]);
});

d3.select("#coin-select")
    .on("change", function() {
        coin = this.value;
        update(newData[coin])
});

d3.select("#var-select")
    .on("change", function() {
        value = this.value;
        if (this.value === "price_usd") {
            textValue = "Price";
        } else if (this.value === "market_cap") {
            textValue = "Market Capitalization";
        } else {
            textValue = "24 Hour Trading Volume";
        }
        update(newData[coin]);
});

$("#date-slider").slider({
    min: date_scale.range()[0],
    max: date_scale.range()[1],
    step: 1,
    range: true,
    values: [date_scale.range()[0], date_scale.range()[1]],
    slide: function(event, ui) {
        var dateRange = ui.values;
        d3.select("#dateLabel1")
            .text(d3.timeFormat("%d/%m/%Y")(date_scale.invert(dateRange[0])));
        d3.select("#dateLabel2")
            .text(d3.timeFormat("%d/%m/%Y")(date_scale.invert(dateRange[1])));
        update(newData[coin]);
    }
});

function update(data) {
    // Only include dates within the range set by the slider
    var filteredData = data.filter(function(d) {
        return !(d.date < parseTime(d3.select("#dateLabel1").text())
            || d.date > parseTime(d3.select("#dateLabel2").text()));
    });

    // Set scale domains
    x_scale.domain(d3.extent(filteredData, function(d) {
            return d.date;
        })
    );
    y_scale.domain(d3.extent(filteredData, function(d) {
            return d[value];
        })
    );

    var t = d3.transition()
        .duration(500);

    yLabel.text(textValue + " (USD)");

    // Generate axes once scales have been set
    xAxis.transition(t)
      .call(xAxisCall.scale(x_scale));
    yAxis.transition(t)
        .call(yAxisCall.scale(y_scale));

    // JOIN new data with old elements
		var path = g.selectAll(".line").data(filteredData);

    // EXIT old elements not present in new data.
    g.selectAll(".line")
        .remove();

    // UPDATE old elements present in new data.

    // ENTER new elements present in new data.
    g.append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "grey")
        .transition(t)
        .attr("d", line(filteredData));

    /******************************** Tooltip Code ********************************/
    g.selectAll(".focus")
        .remove();

    var focus = g.append("g")
        .attr("class", "focus")
        .style("display", "none");

    focus.append("line")
        .attr("class", "x-hover-line hover-line")
        .attr("y1", 0)
        .attr("y2", height);

    focus.append("line")
        .attr("class", "y-hover-line hover-line")
        .attr("x1", 0)
        .attr("x2", width);

    focus.append("circle")
        .attr("r", 7.5);

    focus.append("text")
        .attr("x", 15)
        .attr("dy", ".31em");

    g.selectAll(".overlay")
        .remove();

    g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove", mousemove);

    function mousemove() {
        var x0 = x_scale.invert(d3.mouse(this)[0]),
            i = bisectDate(filteredData, x0, 1),
            d0 = filteredData[i - 1],
            d1 = filteredData[i],
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        focus.attr("transform", "translate(" + x_scale(d.date) + "," + y_scale(d[value]) + ")");
        focus.select("text").text(d[value]);
        focus.select(".x-hover-line").attr("y2", height - y_scale(d[value]));
        focus.select(".y-hover-line").attr("x2", -x_scale(d.date));
    }

    /******************************** Tooltip Code ********************************/
}
