import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Avatar, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Tabs, 
  Tab, 
  Box,
  CircularProgress
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SecurityIcon from '@mui/icons-material/Security';
import GroupsIcon from '@mui/icons-material/Groups';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface LeaderboardUser {
  rank: number;
  username: string;
  avatar: string;
  score: number;
}

type LeaderboardType = 'overall' | 'scam_detection' | 'community_impact';

const LEADERBOARD_TABS = [
  { value: 'overall', label: 'כללי', icon: <TrendingUpIcon /> },
  { value: 'scam_detection', label: 'זיהוי הונאות', icon: <SecurityIcon /> },
  { value: 'community_impact', label: 'תרומה לקהילה', icon: <GroupsIcon /> },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`leaderboard-tabpanel-${index}`}
      aria-labelledby={`leaderboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaderboardType>('overall');
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    const tabKey = LEADERBOARD_TABS[newValue].value as LeaderboardType;
    setActiveTab(tabKey);
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/leaderboard/${activeTab}`);
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeTab]);

  const getTabIcon = (type: LeaderboardType) => {
    switch (type) {
      case 'scam_detection':
        return <SecurityIcon />;
      case 'community_impact':
        return <GroupsIcon />;
      default:
        return <TrendingUpIcon />;
    }
  };

  const getTabLabel = (type: LeaderboardType) => {
    const tab = LEADERBOARD_TABS.find(tab => tab.value === type);
    return tab ? tab.label : '';
  };

  return (
    <Card sx={{ maxWidth: 800, margin: '40px auto', borderRadius: 3, boxShadow: 3, overflow: 'hidden' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.main' }}>
        <Tabs 
          value={tabIndex} 
          onChange={handleTabChange} 
          aria-label="leaderboard tabs"
          variant="fullWidth"
          textColor="inherit"
          indicatorColor="secondary"
        >
          {LEADERBOARD_TABS.map((tab, index) => (
            <Tab 
              key={tab.value}
              icon={tab.icon}
              label={tab.label}
              id={`leaderboard-tab-${index}`}
              aria-controls={`leaderboard-tabpanel-${index}`}
              sx={{ color: 'white', '&.Mui-selected': { color: 'white' } }}
            />
          ))}
        </Tabs>
      </Box>
      
      <CardContent sx={{ p: 0 }}>
        <TabPanel value={tabIndex} index={tabIndex}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'center' }}>
              <EmojiEventsIcon 
                fontSize="large" 
                color="warning" 
                sx={{ 
                  verticalAlign: 'middle', 
                  mr: 1,
                  color: (theme) => {
                    switch (activeTab) {
                      case 'scam_detection':
                        return theme.palette.error.main;
                      case 'community_impact':
                        return theme.palette.success.main;
                      default:
                        return theme.palette.warning.main;
                    }
                  }
                }} 
              />
              <Typography variant="h5" component="h2" align="center">
                טבלת מובילים - {getTabLabel(activeTab)}
              </Typography>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>משתמש</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>ניקוד</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length > 0 ? (
                      users.map((user) => (
                        <TableRow 
                          key={`${user.username}-${activeTab}`}
                          hover 
                          sx={{ 
                            '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                            '&:last-child td, &:last-child th': { border: 0 }
                          }}
                        >
                          <TableCell component="th" scope="row">
                            {user.rank}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar 
                                src={user.avatar} 
                                alt={user.username}
                                sx={{ 
                                  width: 32, 
                                  height: 32, 
                                  mr: 1.5,
                                  border: '1px solid', 
                                  borderColor: 'divider' 
                                }} 
                              />
                              <Typography variant="body2" noWrap>
                                {user.username}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {user.score.toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">אין נתונים להצגה</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>
      </CardContent>
  );
}
