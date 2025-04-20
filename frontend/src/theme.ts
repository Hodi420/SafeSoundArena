import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff5252',
    },
    secondary: {
      main: '#ffd700',
    },
    background: {
      default: '#232323',
      paper: '#333',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    h4: {
      fontWeight: 700,
    },
  },
});

export default theme;
