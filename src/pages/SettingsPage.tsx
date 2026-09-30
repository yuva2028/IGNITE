import { Settings } from 'lucide-react';
import PlaceholderPage from '../components/ui/PlaceholderPage';

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Platform configuration including data source management, alert thresholds, notification preferences, API key management, and user access control."
      phase={1}
      icon={Settings}
      features={[
        'Data source configuration (IMD, NOAA, ECMWF)',
        'Alert threshold customization per region',
        'Notification channel setup (SMS, email, webhook)',
        'Region and basin management',
        'User roles and access control',
        'API key and integration management',
      ]}
      techStack={['React Hook Form', 'Zod Validation', 'Firebase Auth', 'REST API']}
    />
  );
}
