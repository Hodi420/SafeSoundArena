import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Avatar } from '@mui/material';
import { useQuery, useSubscription, gql } from '@apollo/client';
import { client } from '../api/graphql';

const LEADERBOARD_QUERY = gql`
  query Leaderboard($type: String!) {
    leaderboard(type: $type) {
      id
      username
      overallScore
      scamDetectionScore
      communityImpactScore
    }
  }
`;

const LEADERBOARD_SUBSCRIPTION = gql`
  subscription LeaderboardUpdated($type: String!) {
    leaderboardUpdated(type: $type) {
      id
      username
      overallScore
      scamDetectionScore
      communityImpactScore
    }
  }
`;

const SimpleLeaderboard = () => {
  const [tabValue, setTabValue] = useState('overall');
  const { loading, error, data, refetch } = useQuery(LEADERBOARD_QUERY, {
    variables: { type: tabValue },
    client,
  });
  useSubscription(LEADERBOARD_SUBSCRIPTION, {
    variables: { type: tabValue },
    onData: () => {
      refetch();
    },
  });
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };
  // Sort users based on the selected tab
  const sortedUsers = data?.leaderboard || [];
  // Remove sort as it's handled in backend
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        SafeSoundArena Leaderboard
      </Typography>
      
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        aria-label="leaderboard tabs"
        sx={{ mb: 3 }}
      >
        <Tab label="Overall" value="overall" />
        <Tab label="Scam Detection" value="scamDetection" />
        <Tab label="Community Impact" value="communityImpact" />
      </Tabs>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>User</TableCell>
              <TableCell align="right">Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers.map((user, index) => (
              <TableRow key={user.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={user.avatar} />
                  {user.username}
                </TableCell>
                <TableCell align="right">
                  {user[`${tabValue}Score`]}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          This is a simplified version of the leaderboard for testing purposes.
        </Typography>
      </Box>
    </Box>
  );
};
export default SimpleLeaderboard;
