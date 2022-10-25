import "./style.css";
import * as d3 from "d3";

import { lineGraph } from "./line-graph";
import { Int32, Table, Utf8, Float32 } from "apache-arrow";
import { db } from "./duckdb";
import parquet from "./air.parquet?url";
import csv from "./precipitation.csv?url";

import { lineGraph2 } from "./line-graph-2";
import { count } from "d3";

// precipitation data from https://www.weather.gov/media/pbz/records/hisprec.pdf
const app = document.querySelector("#app")!;

// Create the graph. The specific code here makes some assumptions that may not hold for you.
const graph = lineGraph();
const part2_graph = lineGraph2();

async function update(station_name: string) {
  // Query DuckDB for the data we want to visualize.
  let data: Table<{ year_month: Utf8; avg_aqi: Int32 }> = await conn.query(`
  SELECT date_trunc('month', "Timestamp(UTC)") + 15 as year_month, avg("US AQI") as avg_aqi
  FROM air.parquet
  WHERE "Station name" = '${station_name}'
  GROUP BY year_month
  ORDER BY year_month
  `);

  let data_all: Table<{ day: Utf8; aqi: Int32 }> = await conn.query(`
  SELECT "Timestamp(UTC)" as day, "US AQI" as aqi
  FROM air.parquet
  WHERE "Station name" = '${station_name}'
  ORDER BY day`);

  let data_quantiles: Table<{ year_month: Utf8; p10: Int32; p90: Int32 }> =
    await conn.query(`
  SELECT date_trunc('month', "Timestamp(UTC)") + 15 as year_month, quantile_cont("US AQI", 0.1) as p10, quantile_cont("US AQI", 0.9) as p90
  FROM air.parquet
  WHERE "Station name" = '${station_name}'
  GROUP BY year_month
  ORDER BY year_month`);

  if (station_name == "All Stations") {
    data = await conn.query(`
    SELECT date_trunc('month', "Timestamp(UTC)") + 15 as year_month, avg("US AQI") as avg_aqi
    FROM air.parquet
    WHERE "Station name" not NULL
    GROUP BY year_month
    ORDER BY year_month
  `);
    data_all = await conn.query(`
    SELECT "Timestamp(UTC)" as day, "US AQI" as aqi
    FROM air.parquet
    WHERE "Station name" not NULL
    ORDER BY day`);

    data_quantiles = await conn.query(`
    SELECT date_trunc('month', "Timestamp(UTC)") + 15 as year_month, quantile_cont("US AQI", 0.1) as p10, quantile_cont("US AQI", 0.9) as p90
    FROM air.parquet
    WHERE "Station name" not NULL
    GROUP BY year_month
    ORDER BY year_month`);
  }

  // Get the X and Y columns for the graph. Instead of using Parquet, DuckDB, and Arrow, we could also load data from CSV or JSON directly.
  const X_line: Date[] = data
    // .map((d) ==> {return new Date(d);});
    .getChild("year_month")!
    .toJSON()
    .map((d) => {
      return new Date(`${d}`);
    });

  const Y_line: Int32Array = data.getChild("avg_aqi")!.toArray();

  graph.update_line_background(X_line, Y_line);

  const X_scatter: Date[] = data_all
    .getChild("day")!
    .toJSON()
    .map((d) => {
      return new Date(d);
    });

  const Y_scatter: Int32Array = data_all.getChild("aqi")!.toArray();

  text.text(`Number of records: ${X_scatter.length}`);

  const isChecked = d3.select("#checkbox").property("checked");
  if (isChecked) {
    graph.update_scatter(X_scatter, Y_scatter);
  } else {
    graph.update_scatter([], []);
  }

  const X_p10: Date[] = data_quantiles
    .getChild("year_month")!
    .toJSON()
    .map((d) => {
      return new Date(d);
    });

  const Y_p10: Int32Array = data_quantiles.getChild("p10")!.toArray();

  const X_p90: Date[] = data_quantiles
    .getChild("year_month")!
    .toJSON()
    .map((d) => {
      return new Date(d);
    });

  const Y_p90: Int32Array = data_quantiles.getChild("p90")!.toArray();

  graph.update_percentiles(X_p10, Y_p10, X_p90, Y_p90);
}

async function update_p2(year: Int32) {
  // PART 2 HERE
  const data_lawrenceville: Table<{ month: Int32; avg_aqi: Int32 }> =
    await conn.query(`
  SELECT date_part('month', "Timestamp(UTC)") as month, avg("US AQI") as avg_aqi
  FROM air.parquet
  WHERE "Station name" = 'Lawrenceville' and date_part('year', "Timestamp(UTC)") = '${year}'
  GROUP BY month`);

  const X_lawrenceville: Int32Array = data_lawrenceville
    .getChild("month")!
    .toArray();

  const Y_lawrenceville: Int32Array = data_lawrenceville
    .getChild("avg_aqi")!
    .toArray();

  part2_graph.update_aqi(X_lawrenceville, Y_lawrenceville);
  const data_precipitation: Table<{ month: Int32; avg_precip: Int32 }> =
    await conn.query(`
    SELECT "Month" as month, avg("Total Precipitation") as avg_precip
    FROM precipitation.csv
    WHERE "Year" = '${year}'
    GROUP BY month`);

  const X_precip = data_precipitation.getChild("month")!.toArray();

  const Y_precip = data_precipitation.getChild("avg_precip")!.toArray();

  part2_graph.update_precip(X_precip, Y_precip);
}

// Load a Parquet file and register it with DuckDB. We could request the data from a URL instead.
const res = await fetch(parquet);

await db.registerFileBuffer(
  "air.parquet",
  new Uint8Array(await res.arrayBuffer())
);

const res2 = await fetch(csv);
db.registerFileBuffer(
  "precipitation.csv",
  new Uint8Array(await res2.arrayBuffer())
);
// Query DuckDB for the stations.
const conn = await db.connect();

const stations: Table<{ station: Utf8; count: Int32 }> = await conn.query(`
SELECT DISTINCT "Station name" as station, count("US AQI") as 'count'
FROM air.parquet
WHERE station not NULL
GROUP BY station
ORDER BY count desc`);

const all_stations_count: Table<{ count: Int32 }> = await conn.query(`
SELECT count("US AQI") as count
FROM air.parquet
WHERE "Station name" not NULL

`);

const total_count_array: Int32Array = all_stations_count
  .getChild("count")!
  .toArray();
const total_count = total_count_array[0];
console.log(total_count);

d3.select(app).append("h2").text("Part 1");
// Create a select element for the locations.
const select = d3.select(app).append("select");

const station_list: Utf8[] = [];
select.append("option").attr("id", "all").text(`All Stations (${total_count})`); // add  (${row.count}) but idk how
station_list.push("All Stations");

for (const row of stations) {
  select
    .append("option")
    .attr("id", row.station)
    .text(`${row.station} (${row.count})`); // add  (${row.count}) but idk how
  station_list.push(row.station);
}

select.on("change", () => {
  const station = select.property("value");
  for (const station_name of station_list) {
    if (station.includes(station_name)) {
      update(station_name);
    }
  }
});

// checkbox
const br = d3.select(app).append("br");
const label = d3.select(app).append("label").text("Show Raw Data ");
const checkbox = d3
  .select(app)
  .append("input")
  .attr("type", "checkbox")
  .attr("id", "checkbox");
checkbox.on("change", () => {
  const station = select.property("value");
  for (const station_name of station_list) {
    if (station.includes(station_name)) {
      update(station_name);
    }
  }
});

// number of records
const text = d3.select(app).append("p").attr("style", "margin : 0px");

// Update the graph with the first location.
update("All Stations");
// Add the graph to the DOM.

app.appendChild(graph.element);
const br2 = d3.select(app).append("br");
d3.select(app).append("h2").text("Part 2");

d3.select(app).append("label").text("Select Year: ");

const select2 = d3.select(app).append("select");
const years = [2016, 2017, 2018, 2019, 2020, 2021];
for (const year of years) {
  //__ is a table
  select2.append("option").text(year);
}
select2.on("change", () => {
  const year = select2.property("value");
  console.log(year);
  update_p2(year);
});
//Update the graph with the first year
update_p2(2016);

app.appendChild(part2_graph.element);
