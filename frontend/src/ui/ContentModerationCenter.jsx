import React, { useState } from 'react';
import ProfanityFilterDemo from './ProfanityFilterDemo';
import ImageModerationDemo from './ImageModerationDemo';
import DiagnosticsPanel from './DiagnosticsPanel';

export default function ContentModerationCenter() {
  const [consent, setConsent] = useState(false);

  return (
    <div style={{padding:'2rem',maxWidth:600,margin:'auto'}}>
      <h2>Content Moderation & Privacy Center</h2>
      <p>
        This center allows you to check your text, images, and system for safety and compliance.<br/>
        <strong>GDPR Notice:</strong> No personal data is stored without your explicit consent. You can request deletion at any time.
      </p>
      <label>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
        I consent to content moderation and understand my rights under GDPR.
      </label>
      {consent && (
        <>
          <ProfanityFilterDemo />
          <ImageModerationDemo />
          <DiagnosticsPanel />
        </>
      )}
    </div>
  );
}
