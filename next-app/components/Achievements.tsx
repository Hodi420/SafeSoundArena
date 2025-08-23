import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Grid, Chip, Avatar } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  achieved: boolean;
}

export default function Achievements({ userId }: { userId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/achievements/${userId}`)
      .then(res => res.json())
      .then(data => {
        setAchievements(data);
        setLoading(false);
      });
  }, [userId]);

  return (
    <Card sx={{ maxWidth: 600, margin: '40px auto', borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h4" gutterBottom align="center">
          <EmojiEventsIcon fontSize="large" color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
          ההישגים שלי
        </Typography>
        {loading ? (
          <Typography align="center">טוען...</Typography>
        ) : (
          <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            {achievements.map(ach => (
              <div key={ach.id} style={{ margin: 4, display: 'inline-block' }}>
                <Chip
                  avatar={<Avatar src={ach.icon} />}
                  label={ach.name}
                  color={ach.achieved ? 'success' : 'default'}
                  variant={ach.achieved ? 'filled' : 'outlined'}
                  sx={{ minWidth: 140, minHeight: 56, fontSize: 16, p: 1 }}
                  title={ach.description}
                />
              </div>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}
