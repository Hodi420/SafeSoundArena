import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Avatar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  score: number;
}

export default function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  return (
    <Card sx={{ maxWidth: 600, margin: '40px auto', borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h4" gutterBottom align="center">
          <EmojiEventsIcon fontSize="large" color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          טבלת מובילים
        </Typography>
        {loading ? (
          <Typography align="center">טוען...</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>מקום</TableCell>
                  <TableCell>משתמש</TableCell>
                  <TableCell align="right">ניקוד</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user, idx) => (
                  <TableRow key={user.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <Avatar src={user.avatar} sx={{ width: 32, height: 32, mr: 1, display: 'inline-block', verticalAlign: 'middle' }} />
                      <span style={{ marginRight: 8 }}>{user.name}</span>
                    </TableCell>
                    <TableCell align="right">{user.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
