import * as d3 from "d3";

const colors = [
  { name: "Good", min: 0, max: 50, color: "#9cd84e" },
  { name: "Moderate", min: 51, max: 100, color: "#facf39" },
  {
    name: "Unhealthy for Sensitive Groups",
    min: 101,
    max: 150,
    color: "#f99049",
  },
  { name: "Unhealthy", min: 151, max: 160, color: "#f65e5f" },
];

export function lineGraph() {
  const margin = { top: 30, right: 0, bottom: 30, left: 50 };
  const width = document.body.clientWidth;
  const height = 300;

  const xRange = [margin.left, width - margin.right];
  const yRange = [height - margin.bottom, margin.top];

  let mainX = [];
  let mainY = [];
  // Construct scales and axes.
  const xScale = d3.scaleTime().range(xRange).nice();
  const yScale = d3.scaleLinear().range(yRange);
  //   x = d3.scaleLinear()
  // .domain([0, d3.max(gapminder, d => d.fertility)]) d3.max(gapminder, d => d.fertility
  // .range([margin.left, width - margin.right])
  // .nice()

  const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
  const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);

  // // the line (from https://observablehq.com/@d3/line-chart)
  // const line = d3.line()
  // .defined(i => D[i])
  // .curve(curve);
  // // .x(i => xScale(X[i]))
  // // .y(i => yScale(Y[i]));

  // Create the SVG element for the chart.
  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .on("pointermove", pointermoved);
  const background = svg.append("g");

  // Add the x axis
  svg
    .append("g")
    .attr("class", "xaxis")
    .attr("transform", `translate(0,${height - margin.bottom})`);

  // Add the y axis
  svg
    .append("g")
    .attr("class", "yaxis")
    .attr("transform", `translate(${margin.left},0)`);

  // trying to add points
  const points = svg.append("g").attr("fill", "black").attr("class", "point");

  //quantiles
  const percentiles = svg
    .append("g")
    .attr("class", "area")
    .attr("stroke", "none")
    .attr("stroke-width", 3)
    .attr("fill", "black")
    .attr("opacity", "20%");

  // Add the line
  const line = svg
    .append("g")
    .attr("class", "line")
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("fill", "none");

  const tooltip = svg
    .append("g")
    .attr("class", "tooltip")
    .attr("stroke", "black")
    .attr("stroke-width", 3);

  const tooltip_text = svg
    .append("g")
    .attr("font-color", "green")
    .attr("class", "ttText");

  function pointermoved(event) {
    svg.select(".tooltip").selectAll("*").remove();

    update_tooltip_line(
      xScale.invert(d3.pointer(event)[0]),
      yScale.invert(d3.pointer(event)[1])
    );
  }

  function update_tooltip_line(x_value: Date, y_value: number) {
    const I = d3.range(mainX.length);
    // console.log(I) //d3.range(mainX.length)
    //tooltip

    svg.select(".ttText").selectAll("*").remove();

    if (
      xScale(x_value) > margin.left - 10 &&
      xScale(x_value) < width - margin.right + 10 &&
      yScale(y_value) > margin.top - 10 &&
      yScale(y_value) < height - margin.bottom + 10
    ) {
      const closest_date_index = d3.bisectCenter(mainX, x_value);
      const closest_date = mainX[closest_date_index];

      tooltip
        .selectAll(".tooltip")
        .data(I)
        .join("path")
        .attr(
          "d",
          d3.line()([
            [xScale(closest_date), yScale(0)],
            [xScale(closest_date), yScale(160)],
          ])
        );

      tooltip_text
        .selectAll(".ttText")
        .data([1])
        .join("text")
        .attr(
          "transform",
          `translate(${xScale(closest_date) + 5}, ${yScale(
            mainY[closest_date_index]
          )})`
        )
        .attr("font-size", "12")
        .attr("stroke-width", "1px")
        .text(`${closest_date}`);

      tooltip_text
        .selectAll(".ttText")
        .data([1])
        .join("text")
        .attr(
          "transform",
          `translate(${xScale(closest_date) + 5}, ${
            yScale(mainY[closest_date_index]) + 13
          })`
        )
        .attr("font-size", "12")
        .attr("stroke-width", "1px")
        .text(`MEAN US AQI ${mainY[closest_date_index].toFixed(2)}`)
        .append("tspan")
        .text();
    }
  }

  function update_line_background(X: Date[], Y: Int32Array) {
    // UPDATE THIS
    // Here we use an array of indexes as data for D3 so we can process columnar data more easily
    // but you could also directly pass an array of objects to D3.
    const I = d3.range(X.length);

    // const minDate = new Date(Math.min(...Date(X)));
    // const maxDate = new Date(Math.max(...Date(X)));
    mainX = X;
    mainY = Y;
    const domain = d3.extent(X)!;

    xScale.domain(domain);
    yScale.domain([0, 160]);

    //remove background color
    svg.selectAll(".background_color").remove();

    // Construct a line generator. from https://observablehq.com/@d3/line-with-tooltip
    const lineGenerator = d3
      .line()
      .x((i, d) => xScale(X[d]))
      .y((i, d) => yScale(Y[d]));

    // Clear the axis so that when we add the grid, we don't get duplicate lines
    svg.select(".yaxis").selectAll("*").remove();

    // Update axes since we set new domains

    svg.select<SVGSVGElement>(".xaxis").call(xAxis);

    svg
      .select<SVGSVGElement>(".yaxis")
      .call(yAxis)
      // add gridlines
      .call((g) =>
        g
          .selectAll(".tick line")
          .clone()
          .attr("x2", width - margin.right - margin.left)
          .attr("stroke-opacity", 0.1)
      );

    // add the background colors

    for (const color of colors) {
      background
        .append("rect")
        .attr("class", "background_color")
        .attr("width", width - margin.left - margin.right)
        .attr("height", yScale(color["min"]!) - yScale(color["max"]!))
        .attr("transform", `translate(${margin.left},${yScale(color["max"]!)})`)
        .attr("fill", color["color"])
        .attr("fill-opacity", "50%")
        .attr("stroke", color["color"])
        .attr("stroke-width", yScale(1) - yScale(2))
        .attr("stroke-opacity", "50%");
    }
    // Update the marks

    svg.select(".line").selectAll("*").remove();

    line.selectAll(".line").data(I).join("path").attr("d", lineGenerator(X, Y));
  }
  function update_scatter(X: Date[], Y: Int32Array) {
    // Update the marks
    const I = d3.range(X.length);

    const domain = d3.extent(X)!;
    xScale.domain(domain);
    yScale.domain([0, 160]);
    //remove dots

    svg.select(".point").selectAll("*").remove();

    points
      .selectAll("dot")
      .data(I)
      .enter()
      .append("circle")
      .attr("cx", (i, d) => xScale(X[i]))
      .attr("cy", (i, d) => yScale(Y[d]))
      .attr("r", 1)
      .style("fill", "black");
  }

  function update_percentiles(
    X10: Date[],
    Y10: Int32Array,
    X90: Date[],
    Y90: Int32Array
  ) {
    const I = d3.range(X90.length);

    const domain = d3.extent(X10)!;
    xScale.domain(domain);
    yScale.domain([0, 160]);

    // area generator
    const areaGenerator = d3
      .area()
      .x((i, d) => xScale(X10[d]))
      .y0((i, d) => yScale(Y10[d]))
      .y1((i, d) => yScale(Y90[d]));

    svg.select(".area").selectAll("*").remove();

    percentiles
      .selectAll(".area")
      .data(I)
      .join("path")
      .attr("stroke-opacity", "100%")
      .attr("d", areaGenerator(X10, Y10, Y90));
  }

  return {
    element: svg.node()!,
    update_line_background,
    update_scatter,
    update_percentiles,
  };
}
