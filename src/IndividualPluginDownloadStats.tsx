import React, {useCallback, useEffect, useMemo, useState} from "react";
import PluginSelect from "./PluginSelect";
import {
  AppBar,
  Box,
  Container,
  FormControl,
  IconButton,
  Paper,
  SvgIcon,
  Toolbar,
  Tooltip,
  Typography
} from "@mui/material";
import {LineChart} from "@mui/x-charts";
import {fetchLastUpdatedTimestamp, Plugin, PluginStatsResponse} from "./lib/StatsApi";
import dayjs, {Dayjs} from "dayjs";
import Footer from "./Footer";
import DateRangePicker from "./DateRangePicker";

function GithubIcon() {
  return (
    <SvgIcon fontSize="small">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.76 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </SvgIcon>
  );
}

function HeaderBar() {
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{
      backgroundColor: 'rgba(250, 250, 250, 0.8)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid',
      borderColor: 'divider',
    }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters variant="dense" sx={{ minHeight: 56 }}>
          <Typography variant="subtitle1" component="div" sx={{
            flexGrow: 1,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}>
            Krew Index Tracker
          </Typography>
          <Tooltip title="View on GitHub">
            <IconButton
              aria-label="GitHub"
              color="inherit"
              href="https://github.com/predatorray/krew-index-tracker"
              target="_blank"
              rel="noopener"
            >
              <GithubIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </Container>
    </AppBar>
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

  return (
    <Box sx={{ height: 400, width: "100%" }}>
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
          color: '#111111',
          showMark: false,
        }]}
        grid={{ horizontal: true }}
        margin={{ left: 80 }}
        sx={{
          '& .MuiChartsGrid-line': { stroke: '#eceef1' },
          '& .MuiLineElement-root': { strokeWidth: 2 },
        }}
      />
      <Typography variant="body2" color="text.secondary" component="div" sx={{
        fontSize: 12,
        textAlign: "center",
        mt: 1,
      }}>
        {
          timestamp && (
            <>Last updated {dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm')}</>
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
      <Typography variant="h1" sx={{
        fontSize: 28,
        fontWeight: 600,
        letterSpacing: '-0.02em',
      }}>
        Plugin download stats
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Calculated from the total download count of release assets on GitHub.
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
      <Container maxWidth="lg" sx={{ textAlign: "left", mt: { xs: 4, md: 6 } }}>
        <TitleAndSubtitle/>
        <Box sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "center" },
          gap: 2,
          mt: 4,
          mb: 2,
        }}>
          <FormControl size="small">
            <PluginSelect onPlugin={setSelectedPlugin} />
          </FormControl>
          <Box sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}>
            <DateRangePicker
              defaultStartDate={startDate}
              defaultEndDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              startDate={startDate}
              endDate={endDate}
            />
          </Box>
        </Box>
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 3 }, pt: { xs: 2, sm: 4 } }}>
          <StatsLineChart dataset={dataset} labelY={selectedPlugin?.pluginName}/>
        </Paper>
      </Container>
      <Footer/>
    </>
  )
}
