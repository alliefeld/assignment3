import * as d3 from "d3";
import svg from "./line-graph";

export function lineGraph2() {
  const margin = { top: 30, right: 50, bottom: 30, left: 50 };
  const width = document.body.clientWidth;
  const height = 300;

  const xRange = [margin.left, width - margin.right];
  const yRange = [height - margin.bottom, margin.top];

  // Construct scales and axes.
  const xScale = d3.scaleLinear().range(xRange).nice();
  const yScale_aqi = d3.scaleLinear().range(yRange);
  const yScale_precip = d3.scaleLinear().range(yRange);

  const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
  const yAxis_aqi = d3.axisLeft(yScale_aqi).tickSizeOuter(0);
  const yAxis_precip = d3.axisRight(yScale_precip).tickSizeOuter(0);

  // Create the SVG element for the chart.
  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  // Add the x axis
  svg
    .append("g")
    .attr("class", "xaxis")
    .attr("transform", `translate(0,${height - margin.bottom})`);

  // Add the y axes
  svg
    .append("g")
    .attr("class", "yaxis_aqi")
    .attr("transform", `translate(${margin.left},0)`);

  svg
    .append("g")
    .attr("class", "yaxis_precip")
    .attr("transform", `translate(${width - margin.right}, 0)`);

  // Add the line
  const aqi_line = svg
    .append("g")
    .attr("class", "aqi")
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("fill", "none");

  const precip_line = svg
    .append("g")
    .attr("class", "precip")
    .attr("stroke", "blue")
    .attr("stroke-width", 2)
    .attr("fill", "none");

  function update_aqi(X: number[], Y: number[]) {
    // Here we use an array of indexes as data for D3 so we can process columnar data more easily
    // but you could also directly pass an array of objects to D3.
    const I = d3.range(X.length);
    console.log(I);

    xScale.domain([1, 12]);
    yScale_aqi.domain([0, 160]);

    svg.select<SVGSVGElement>(".xaxis").call(xAxis);

    svg.select(".yaxis_aqi").selectAll("*").remove();

    svg
      .select<SVGSVGElement>(".yaxis_aqi")
      .call(yAxis_aqi)

      // add gridlines
      .call((g) =>
        g
          .selectAll(".tick line")
          .clone()
          .attr("x2", width - margin.right - margin.left)
          .attr("stroke-opacity", 0.1)
      );
    // Construct a line generator. from https://observablehq.com/@d3/line-with-tooltip
    const lineGenerator = d3
      .line()
      .x((d, i) => xScale(Number(X[i])))
      .y((d, i) => yScale_aqi(Number(Y[i])));

    svg.select(".aqi").selectAll("*").remove();

    aqi_line
      .selectAll(".aqi")
      .data(I)
      .join("path")
      .attr("d", lineGenerator(X, Y));

    svg.select<SVGSVGElement>(".yaxis_aqi").call(yAxis_aqi);
  }

  function update_precip(X: number[], Y: number[]) {
    const I = d3.range(X.length);
    yScale_precip.domain([0, 16]);

    const lineGenerator = d3
      .line()
      .x((d, i) => xScale(Number(X[i])))
      .y((d, i) => yScale_precip(Number(Y[i])));

    svg.select(".precip").selectAll("*").remove();

    precip_line
      .selectAll(".precip")
      .data(I)
      .join("path")
      .attr("d", lineGenerator(X, Y));

    svg
      .select<SVGSVGElement>(".yaxis_precip")
      .call(yAxis_precip)
      .call((g) =>
        g
          .selectAll("la")
          .clone()
          .attr("x1", width - margin.right - margin.left)
          // .attr("x2", width - margin.right)
          .attr("stroke-opacity", 0.1)
      );
  }

  return {
    element: svg.node()!,
    update_aqi,
    update_precip,
  };
}
