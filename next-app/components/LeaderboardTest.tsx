import React, { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import { awardPoints } from '../core/scoring';
import { Leaderboard } from './Leaderboard';

type ActionType = keyof typeof POINTS;

// This is a test component to demonstrate the leaderboard functionality
// In a real app, these actions would be triggered by actual user actions
const LeaderboardTest: React.FC = () => {
  const [userId, setUserId] = useState<string>('test-user');
  const [action, setAction] = useState<ActionType>('DAILY_LOGIN');
  const [multiplier, setMultiplier] = useState<number>(1);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleAwardPoints = async () => {
    try {
      const response = await awardPoints(userId, action, multiplier);
      setResult({
        success: response.success,
        message: response.success
          ? `Awarded ${POINTS[action] * multiplier} points for ${action}`
          : 'Failed to award points',
      });
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '40px auto', '& > * + *': { mt: 3 } }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Test Leaderboard Integration
          </Typography>

          <Box sx={{ '& > *': { mb: 2 }, '& > *:last-child': { mb: 0 } }}>
            <TextField
              fullWidth
              label="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              margin="normal"
            />

            <TextField
              select
              fullWidth
              label="Action Type"
              value={action}
              onChange={(e) => setAction(e.target.value as ActionType)}
              margin="normal"
            >
              {Object.keys(POINTS).map((key) => (
                <MenuItem key={key} value={key}>
                  {key} ({POINTS[key as ActionType]} points)
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              type="number"
              label="Multiplier"
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value) || 1)}
              margin="normal"
              inputProps={{ min: 1 }}
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleAwardPoints}
              fullWidth
              size="large"
            >
              Award Points
            </Button>

            {result && (
              <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                {result.message}
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Leaderboard Preview
          </Typography>
          <Leaderboard />
        </CardContent>
      </Card>
    </Box>
  );
};

// Helper to make POINTS available in this file
const POINTS = {
  // Scam Detection
  REPORT_SCAM: 50,
  CONFIRM_SCAM: 25,
  PREVENT_SCAM: 100,

  // Community Impact
  HELP_OTHER: 10,
  COMPLETE_TUTORIAL: 50,
  COMPLETE_DAILY_QUEST: 30,
  COMPLETE_WEEKLY_QUEST: 100,
  REFER_FRIEND: 75,

  // Moderation
  CONTENT_REVIEW: 20,
  CONTENT_FLAG_REVIEW: 15,

  // Engagement
  DAILY_LOGIN: 5,
  WEEKLY_STREAK: 25,
} as const;

export default LeaderboardTest;
