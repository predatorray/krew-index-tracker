import React from 'react';
import './App.css';
import IndividualPluginDownloadStats from "./IndividualPluginDownloadStats";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {LocalizationProvider} from "@mui/x-date-pickers";
import {createTheme, ThemeProvider} from "@mui/material";

const defaultTheme = createTheme({
  palette: {
    primary: {
      main: '#121212',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={defaultTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <IndividualPluginDownloadStats/>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
