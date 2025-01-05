import React, {useCallback, useEffect, useMemo, useState} from "react";
import PluginSelect from "./PluginSelect";
import {
  AppBar,
  Avatar,
  Box,
  Container,
  FormControl,
  IconButton,
  Toolbar,
  Tooltip,
  Typography
} from "@mui/material";
import {LineChart} from "@mui/x-charts";
import {fetchLastUpdatedTimestamp, Plugin, PluginStatsResponse} from "./lib/StatsApi";
import dayjs, {Dayjs} from "dayjs";
import Footer from "./Footer";
import DateRangePicker from "./DateRangePicker";

function HeaderBar() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary" sx={{ backgroundColor: 'dark' }}>
        <Container maxWidth="lg">
          <Toolbar variant="regular">
            <Typography variant="h6" color="inherit" component="div" sx={{
              flexGrow: 1,
              fontWeight: 600,
            }}>
              Krew Index Tracker
            </Typography>
            <Tooltip title="Fork me on GitHub">
              <IconButton sx={{ p: 0 }} href="https://github.com/predatorray/krew-index-tracker" target="_blank">
                <Avatar alt="Github" sx={{ width: 30, height: 30 }} src={`${process.env.PUBLIC_URL}/github-mark-white.svg`} />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Container>
      </AppBar>
    </Box>
  );
}

type DataSet = {x: Date, y: number}[];

function StatsLineChart({ dataset, labelY }: {
  dataset: DataSet;
  labelY?: string;
}) {
  const [timestamp, setTimestamp] = useState<number>();
  useEffect(() => {
    fetchLastUpdatedTimestamp().then(timestamp => {
      setTimestamp(timestamp);
    });
  }, []);

  const minY = useMemo(() => {
    return dataset.map(d => d.y).filter(y => y && !Number.isNaN(y)).reduce((a, b) => a ? Math.min(a, b) : b, 0);
  }, [dataset]);

  const maxY = useMemo(() => {
    return dataset.map(d => d.y).filter(y => y && !Number.isNaN(y)).reduce((a, b) => a ? Math.max(a, b) : 0, 0);
  }, [dataset]);

  console.log(`dataset: ${JSON.stringify(dataset)}, minY: ${minY}, maxY: ${maxY}`);

  return (
    <Box sx={{ height: "400px", width: "100%" }}>
      <LineChart
        dataset={dataset}
        xAxis={[{
          id: 'Years',
          scaleType: 'time',
          dataKey: 'x',
          valueFormatter: (date: Date) => date.toDateString(),
        }]}
        yAxis={[{
          min: minY === 0 ? undefined : minY,
          max: maxY === 0 ? undefined : maxY,
        }]}
        series={[{
          dataKey: 'y',
          connectNulls: true,
          label: labelY,
          color: '#121212',
        }]}
        grid={{ vertical: true, horizontal: true }}
        margin={{ left: 100 }}
      />
      <Typography variant="body2" color="text.secondary" component="div" sx={{
        fontSize: 12,
        fontStyle: 'italic',
        textAlign: "center",
      }}>
        {
          timestamp && (
            <>Last Updated at: <span style={{ borderBottom: '1px dotted #000' }}>{dayjs.unix(timestamp).toISOString()}</span></>
          )
        }
      </Typography>
    </Box>
  );
}

const now = dayjs();
const defaultStartDate = now.subtract(7, 'days');
const defaultEndDate = now;

function useDateRange() {
  const [dateRange, setDateRange] = React.useState<[Dayjs | null, Dayjs | null]>([defaultStartDate, defaultEndDate]);

  const datesWithinRange: Dayjs[] = useMemo(() => {
    if (!dateRange[0] || !dateRange[1]) {
      return [];
    }
    if (dateRange[0]?.isAfter(dateRange[1])) {
      return [];
    }

    const endDate = dateRange[1];
    const startDate = endDate.diff(dateRange[0], 'days') > 365 ? endDate?.subtract(365, 'days') : dateRange[0];

    const dates: Dayjs[] = [];
    for (let date = startDate; date <= endDate; date = date.add(1, "day")) {
      dates.push(date);
    }
    return dates;
  }, [dateRange]);

  const setStartDate = useCallback((startDate: Dayjs | null) => {
    setDateRange(prev => [startDate, prev[1]]);
  }, []);
  const setEndDate = useCallback((endDate: Dayjs | null) => {
    setDateRange(prev => [prev[0], endDate]);
  }, []);

  const startDate = useMemo(() => dateRange[0], [dateRange]);
  const endDate = useMemo(() => dateRange[1], [dateRange]);

  return {
    setStartDate,
    setEndDate,
    startDate,
    endDate,
    datesWithinRange,
  };
}

function TitleAndSubtitle() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Typography variant="h4" color="inherit" sx={{
        my: 2,
        fontSize: 20,
        fontWeight: 500,
        mb: 0,
      }}>
        Individual Plugin Download Stats
      </Typography>
      <Typography variant="body2" color="inherit" sx={{
        fontSize: 10,
        color: '#777',
        minWidth: 320,
        mt: 1,
      }}>
        calculated from total download count of release assets on GitHub
      </Typography>
    </Box>
  );
}

export default function IndividualPluginDownloadStats() {
  const [selectedPlugin, setSelectedPlugin] = React.useState<Plugin | null>(null);

  const {
    setStartDate,
    setEndDate,
    startDate,
    endDate,
    datesWithinRange,
  } = useDateRange();

  const [stats, setStats] = useState<PluginStatsResponse['stats']>();

  useEffect(() => {
    if (!selectedPlugin || !startDate || !endDate) {
      setStats(undefined);
      return;
    }
    selectedPlugin.getStats().then(response => {
      setStats(response.stats);
    });
  }, [endDate, selectedPlugin, startDate]);

  const dataset: DataSet = useMemo(() => {
    if (!stats || datesWithinRange.length === 0) {
      return [];
    }
    return datesWithinRange.map(date => ({
      x: date.toDate(),
      y: stats[date.format('YYYY-MM-DD')]?.downloads,
    }));
  }, [datesWithinRange, stats]);

  return (
    <>
      <HeaderBar/>
      <Container maxWidth="lg" sx={{
        textAlign: "left",
        marginTop: 4,
      }}>
        <Box sx={{
          display: "flex",
          justifyContent: "space-between",
          flexDirection: {
            xs: "column",
            sm: "column",
            md: "column",
            lg: "row",
            xl: "row",
          },
          mx: 4,
        }}>
          <TitleAndSubtitle/>
          <Box sx={{
            display: 'flex',
            textAlign: 'right',
            flexDirection: {
              xs: "column",
              sm: "column",
              md: "row",
              lg: "row",
              xl: "row",
            },
          }}>
            <FormControl variant="outlined" size="small" sx={{ m: 1 }}>
              <PluginSelect onPlugin={setSelectedPlugin} />
            </FormControl>
            <FormControl variant="outlined" size="small" sx={{
              m: 1,
              flexDirection: {
                xs: "column",
                sm: "row",
                md: "row",
                lg: "row",
                xl: "row",
              },
              display: "flex",
              justifyContent: "space-between",
            }}>
              <DateRangePicker
                defaultStartDate={startDate}
                defaultEndDate={endDate}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                startDate={startDate}
                endDate={endDate}
              />
            </FormControl>
          </Box>
        </Box>
        <StatsLineChart dataset={dataset} labelY={selectedPlugin?.pluginName}/>
      </Container>
      <Footer/>
    </>
  )
}
