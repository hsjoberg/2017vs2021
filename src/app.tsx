import { h } from "preact";
import style from "./style.css";
import "../node_modules/react-vis/dist/style.css";
import {
  FlexibleHeightXYPlot,
  LineSeries,
  XAxis,
  YAxis,
  HorizontalGridLines,
  VerticalGridLines,
  Crosshair,
} from "react-vis";
import { parseISO, formatISO } from "date-fns";
import { useEffect, useState } from "preact/hooks";
import { AutoSizer, Size } from "react-virtualized";

interface GraphData {
  x: number;
  y: number;
  price?: number;
}

interface CoindeskApiResult {
  bpi: {
    [key: string]: number;
  };
}

function formatCoindeskApiResult(apiResult: CoindeskApiResult): GraphData[] {
  const entries = Object.entries(apiResult.bpi);

  const startPrice = entries[0][1] || 1;

  return Object.entries(apiResult.bpi).map((day) => {
    const date = parseISO(day[0]);
    date.setFullYear(0);

    return {
      x: date.getTime(),
      y: ((day[1] - startPrice) / startPrice) * 100,
      price: day[1],
    };
  });
}

const COINDESK_API = "https://api.coindesk.com/v1/bpi/historical/close.json";

interface PriceCorsair {
  index: number;
  data: GraphData[];
}

export default function () {
  const [price2017, setPrice2017] = useState<GraphData[]>([]);
  const [price2021, setPrice2021] = useState<GraphData[]>([]);
  const [price2017Corshair, setPrice2017Corshair] = useState<PriceCorsair | undefined>(undefined);
  const [price2021Corshair, setPrice2021Corshair] = useState<PriceCorsair | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const result2017 = await fetch(`${COINDESK_API}?start=2017-01-01&end=2017-12-31`);
      const result2017Json = (await result2017.json()) as CoindeskApiResult;
      setPrice2017(formatCoindeskApiResult(result2017Json));

      const result2021 = await fetch(`${COINDESK_API}/close.json?start=2021-01-01&end=2021-12-31`);
      const result2021Json = (await result2021.json()) as CoindeskApiResult;
      setPrice2021(formatCoindeskApiResult(result2021Json));
    })();
  }, []);

  return (
    <div style={containerStyle} class={style.app}>
      <AutoSizer>
        {({ width, height }: Size) => (
          <FlexibleHeightXYPlot
            onMouseLeave={() => {
              setPrice2017Corshair(undefined);
              setPrice2021Corshair(undefined);
            }}
            xType="time"
            yType="linear"
            width={width}
            height={height}
          >
            <XAxis title="Date" />
            <YAxis title="Percentage" tickFormat={(value) => value + "%"} hideLine width={50} />
            <HorizontalGridLines />
            <VerticalGridLines />

            <LineSeries
              onNearestX={(datapoint, data) => {
                setPrice2017Corshair({
                  index: data.index,
                  data: [datapoint],
                });
              }}
              data={price2017}
            />

            <LineSeries
              onNearestX={(datapoint, data) => {
                if (data.index === price2021.length - 1) {
                  setPrice2021Corshair(undefined);
                  return;
                }

                setPrice2021Corshair({
                  index: data.index,
                  data: [datapoint],
                });
              }}
              data={price2021}
            />

            {price2017Corshair && (
              <Crosshair
                style={{
                  box: {
                    marginTop: 400,
                  },
                }}
                values={price2017Corshair.data}
                itemsFormat={(x) => {
                  return [
                    {
                      title: "Percentage increase",
                      value: Math.round(price2017[price2017Corshair.index].y) + "%",
                    },
                    {
                      title: "Price",
                      value: "$" + Math.round(price2017[price2017Corshair.index].price!),
                    },
                  ];
                }}
                titleFormat={(x) => {
                  const date = new Date(price2017[price2017Corshair.index].x);
                  date.setFullYear(2017);
                  return {
                    title: "Date",
                    value: formatISO(date).slice(0, 10),
                  };
                }}
              />
            )}
            {price2021Corshair && (
              <Crosshair
                style={{
                  box: {
                    marginTop: 465,
                  },
                }}
                values={price2021Corshair.data}
                itemsFormat={() => {
                  return [
                    {
                      title: "Percentage increase",
                      value: Math.round(price2021[price2021Corshair.index].y) + "%",
                    },
                    {
                      title: "Price",
                      value: "$" + Math.round(price2021[price2021Corshair.index].price!),
                    },
                  ];
                }}
                titleFormat={() => {
                  const date = new Date(price2021[price2021Corshair.index].x);
                  date.setFullYear(2021);
                  return {
                    title: "Date",
                    value: formatISO(date).slice(0, 10),
                  };
                }}
              />
            )}
          </FlexibleHeightXYPlot>
        )}
      </AutoSizer>
    </div>
  );
}

const containerStyle: h.JSX.CSSProperties = {
  minHeight: "100%",
  width: "100%",
  paddingLeft: "4vw",
  paddingRight: "4vw",
  paddingTop: "4vh",
  paddingBottom: "4vh",
};
