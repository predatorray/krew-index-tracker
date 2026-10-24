import React from 'react';
import IndividualPluginDownloadStats from "./IndividualPluginDownloadStats";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {LocalizationProvider} from "@mui/x-date-pickers";
import {createTheme, ThemeProvider} from "@mui/material";

const defaultTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#111111',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#111111',
      secondary: '#6b7280',
    },
    divider: '#e5e7eb',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e5e7eb',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#9ca3af',
          },
        },
      },
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
