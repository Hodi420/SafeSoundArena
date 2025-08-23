import React from 'react';
import dynamic from 'next/dynamic';
import { Box, Typography, Container } from '@mui/material';

// Dynamically import the LeaderboardTest component with SSR disabled
const LeaderboardTest = dynamic(
  () => import('../components/LeaderboardTest'),
  { ssr: false }
);

const LeaderboardTestPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Leaderboard Test Page
        </Typography>
        <Typography variant="body1" paragraph>
          Use this page to test the leaderboard functionality. You can award points for different actions
          and see how they affect the leaderboard in real-time.
        </Typography>
        <LeaderboardTest />
      </Box>
    </Container>
  );
};

export default LeaderboardTestPage;
