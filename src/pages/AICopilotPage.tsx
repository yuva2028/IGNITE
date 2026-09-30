import { Bot } from 'lucide-react';
import PlaceholderPage from '../components/ui/PlaceholderPage';

export default function AICopilotPage() {
  return (
    <PlaceholderPage
      title="AI Copilot"
      description="Conversational AI assistant powered by Gemini, enabling natural language queries about impact assessment, evacuation status, and situational briefings for emergency managers."
      phase={8}
      icon={Bot}
      features={[
        'Natural language cyclone impact Q&A (Gemini)',
        'Automated situation report generation',
        'Structured briefing drafts for decision-makers',
        'Multi-source data fusion and synthesis',
        'Voice query support for field operations',
        'Context-aware recommendations and action items',
      ]}
      techStack={['Gemini 1.5 Pro', 'Vertex AI', 'RAG Pipeline', 'Streaming API']}
    />
  );
}
