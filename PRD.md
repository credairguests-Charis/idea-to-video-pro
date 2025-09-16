# Product Requirements Document (PRD)
## AI Video Ad Creation Platform

---

## Features

### 1. Script Generation
**Auto-Generate from Ideas**
- AI analyzes user's brief description or business idea
- Generates compelling, conversion-focused scripts
- Multiple script variations for A/B testing
- Customizable tone (professional, casual, energetic, etc.)
- Industry-specific templates and best practices

**Manual Script Input**
- Rich text editor for custom scripts
- Script length recommendations for platform optimization
- Real-time character count and duration estimates
- Spell check and grammar suggestions
- Script templates library for common use cases

**Audio-to-Script Conversion**
- Upload audio files (MP3, WAV, M4A)
- Real-time transcription with high accuracy
- Automatic punctuation and formatting
- Edit transcribed text before video generation
- Support for multiple languages and accents

### 2. Dialogue-Based User Interface
**Chat-Style Main Interface**
- Primary text input area for user ideas/scripts
- Conversational AI assistant guiding the process
- Chat history for easy reference to previous sessions
- Natural language processing for intent recognition

**Guided Option Buttons (ChatGPT-style)**
- **Script Options**: "Generate Script", "Upload Audio", "Write Custom"
- **Style Choices**: "Professional", "Casual", "Energetic", "Testimonial"
- **Actor Selection**: "Browse Actors", "Filter by Demographics", "Random Selection"
- **Platform Targeting**: "Social Media", "Website", "Email", "Ads"
- **Format Options**: "Portrait", "Landscape", "Square"

**Contextual Dialogues**
- Modal popups for detailed selections
- Inline editing for quick adjustments
- Progressive disclosure of advanced options
- Smart suggestions based on previous choices

### 3. Actor Selection System
**Diverse AI Actor Library**
- **Demographics**: Male, female, non-binary representation
- **Age Ranges**: Young adult, adult, senior options
- **Ethnicities**: Global representation across all major demographics
- **Accents**: American, British, Australian, Canadian, and international accents
- **Professional Categories**: Business, casual, medical, tech, retail, etc.

**Actor Filtering & Search**
- Filter by gender, age, ethnicity, accent
- Search by keywords or scenarios
- Preview voice samples and personality traits
- Favorite/bookmark preferred actors
- Recently used actors for quick access

**Multi-Actor Selection**
- Select multiple actors simultaneously
- Batch generation with different actors
- Compare performance across actor variations
- Mix and match for different campaign segments

**Future: Custom Avatars**
- Voice cloning capabilities (roadmap)
- Custom avatar creation from photos (roadmap)
- Brand-specific actor development (enterprise feature)

### 4. Output Format Options
**Aspect Ratio Selection**
- **Portrait (9:16)**: TikTok, Instagram Stories, Reels
- **Landscape (16:9)**: YouTube, Facebook, website headers
- **Square (1:1)**: Instagram feed, Facebook posts
- **Custom ratios**: Based on specific platform requirements

**Quality Settings**
- HD (1080p) standard for all outputs
- 4K option for premium subscribers
- Optimized file sizes for different platforms
- Multiple format exports (MP4, MOV, WebM)

### 5. Pricing & Access Model
**Subscription Tiers**
- **Free Tier**: 3 videos/month, watermarked, limited actors
- **Starter ($29/month)**: 25 videos, HD quality, full actor library
- **Professional ($79/month)**: 100 videos, 4K option, priority processing
- **Enterprise ($199/month)**: Unlimited videos, custom actors, API access

**Credit System**
- Pay-per-video option for occasional users
- Credits never expire
- Bulk credit packages with discounts
- Corporate credit pools for team usage

---

## UX Flow

### Step-by-Step User Interaction:

**1. Project Initiation**
- User lands on clean, chat-style interface
- Welcome message explains the simple process
- Primary input: "What kind of video ad do you want to create?"

**2. Idea Input & Script Development**
- User types business idea, product description, or campaign goal
- AI suggests script approaches via clickable buttons:
  - "Generate professional script"
  - "Create testimonial style"
  - "Write casual explanation"
  - "Upload my own audio"
- User selects preferred approach or provides more details

**3. Script Refinement**
- AI generates initial script based on user input
- User can edit directly in text area
- Suggestions appear as buttons:
  - "Make it more energetic"
  - "Add urgency"
  - "Include call-to-action"
  - "Shorten for social media"

**4. Style & Platform Selection**
- Buttons appear for video style selection:
  - "Professional presentation"
  - "Casual conversation"
  - "Product demonstration"
  - "Customer testimonial"
- Platform targeting buttons:
  - "Social media ads"
  - "Website hero video"
  - "Email marketing"

**5. Actor Selection**
- "Choose your spokesperson" interface opens
- Grid view of available actors with preview thumbnails
- Filter options on the left sidebar
- Multiple selection possible with clear indication
- "Generate with all selected actors" button

**6. Format & Final Settings**
- Aspect ratio selection with visual examples
- Platform-specific recommendations
- Quality settings (if applicable to plan)
- Final review of all selections

**7. Generation & Preview**
- Progress indicator during video creation
- Estimated completion time displayed
- Preview available as soon as generation completes
- Options to regenerate with different settings

**8. Download & Export**
- High-quality download links
- Multiple format options
- Direct sharing to social platforms (future feature)
- Save to user's video library

---

## Integrations

### Backend Infrastructure
**Supabase Integration**
- **Authentication**: Email/password, social login, magic links
- **Database**: User profiles, video history, subscription data
- **Storage**: Generated videos, uploaded audio files, user assets
- **Real-time**: Live generation status updates
- **Row Level Security**: Secure user data isolation

### AI & Media Services
**AI Video Generation API**
- Primary integration with leading AI video generation service
- Fallback providers for reliability
- Queue management for high-demand periods
- Webhook integration for completion notifications

**Speech Processing**
- **Speech-to-Text**: High-accuracy transcription service
- **Text-to-Speech**: Natural voice synthesis for AI actors
- **Voice Cloning**: Future integration for custom voices
- **Audio Enhancement**: Noise reduction and quality improvement

### Payment Processing
**Subscription Management**
- Stripe integration for recurring billing
- Usage tracking and overage billing
- Plan upgrades/downgrades with proration
- Corporate billing and invoicing
- International payment support

### Analytics & Performance
**User Analytics**
- Video generation tracking
- User engagement metrics
- Performance analytics per video
- A/B testing infrastructure
- Conversion tracking integration

### Future Integrations
**Social Media Platforms**
- Direct posting to Facebook, Instagram, TikTok
- Campaign management integration
- Performance tracking across platforms
- Automated optimization based on performance

**Marketing Tools**
- CRM integration (HubSpot, Salesforce)
- Email marketing platforms (Mailchimp, Klaviyo)
- Analytics platforms (Google Analytics, Mixpanel)

---

## Constraints

### Technical Constraints
**Lovable.dev Platform**
- Must be built using React, TypeScript, Tailwind CSS
- Vite build system requirements
- Client-side only application structure
- Progressive Web App capabilities

**Supabase Backend Requirements**
- Authentication system must use Supabase Auth
- Database operations through Supabase client
- File storage via Supabase Storage
- Real-time features using Supabase Realtime
- Edge functions for server-side processing

### Performance Constraints
**Video Generation**
- Maximum video length: 60 seconds for optimal processing
- Queue system required for handling concurrent requests
- Progress tracking and status updates essential
- Timeout handling for failed generations

**File Upload Limits**
- Audio uploads: Maximum 50MB, 10 minutes duration
- Supported formats: MP3, WAV, M4A, AAC
- Client-side file validation and compression

### Business Constraints
**Content Moderation**
- Automated content filtering for inappropriate material
- Terms of service compliance checking
- Copyright and trademark protection
- GDPR and privacy regulation compliance

**Scalability Planning**
- Architecture must support 10,000+ concurrent users
- CDN integration for global video delivery
- Horizontal scaling capabilities
- Cost optimization for AI service usage

**Competitive Positioning**
- Must differentiate from existing solutions (Synthesia, D-ID, etc.)
- Focus on conversational UX as key differentiator
- Pricing strategy to undercut enterprise solutions
- Feature roadmap aligned with market demands