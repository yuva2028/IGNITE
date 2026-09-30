import { FileText } from 'lucide-react';
import PlaceholderPage from '../components/ui/PlaceholderPage';

export default function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Automated report generation for situation briefs, post-event assessments, and pre-positioning decisions — formatted for NDMA, district collectors, and field teams."
      phase={7}
      icon={FileText}
      features={[
        'Auto-generated situation reports (PDF/DOCX)',
        'District Collector briefing templates',
        'Pre-positioning recommendation reports',
        'Post-event damage assessment summaries',
        'AI-drafted executive summaries (Gemini)',
        'Scheduled and on-demand export options',
      ]}
      techStack={['PDF Generation', 'Gemini API', 'Template Engine', 'Cloud Storage']}
    />
  );
}
