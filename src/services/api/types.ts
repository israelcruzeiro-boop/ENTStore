import type { CourseLayoutTemplate, UserRole } from '@/types';

export interface ApiCompanyTheme {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  text: string;
}

export interface ApiCompanyHero {
  title: string;
  subtitle: string;
  ctaLabel: string | null;
  imageUrl: string | null;
}

export interface ApiCompanyBranding {
  logoUrl: string | null;
  faviconUrl: string | null;
  theme: ApiCompanyTheme;
  hero: ApiCompanyHero;
}

export interface ApiCompanyGeneral {
  orgLevels: string[];
  orgUnitName: string;
}

export interface ApiCompanyPublicView {
  id: string;
  name: string;
  slug: string;
  linkName: string;
  branding: ApiCompanyBranding;
  general: ApiCompanyGeneral;
  landingPageActive?: boolean;
  landingPageEnabled?: boolean;
  landingPageLayout?: string | null;
}

export interface ApiCompanyFeatureFlags {
  repositories: boolean;
  lms: boolean;
  checklists: boolean;
  surveys: boolean;
  metrics: boolean;
}

export interface ApiCompanyAuthenticatedView extends ApiCompanyPublicView {
  status: 'ACTIVE' | 'INACTIVE';
  active: boolean;
  features: ApiCompanyFeatureFlags;
  supportEmail: string | null;
  landingPageEnabled?: boolean;
  landingPageActive?: boolean;
  landingPageLayout?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiTenantBranding {
  companyId: string;
  name: string;
  slug: string;
  linkName: string;
  branding: ApiCompanyBranding;
  orgUnitName: string;
  orgLevels: string[];
}

export type ApiUserStatus = 'ACTIVE' | 'PENDING_SETUP' | 'INACTIVE';

export interface ApiUserView {
  id: string;
  companyId: string;
  name: string;
  email: string;
  cpf: string | null;
  role: UserRole;
  status: ApiUserStatus;
  active: boolean;
  firstAccess: boolean;
  onboardingCompleted: boolean;
  avatarUrl: string | null;
  orgUnitId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiInviteView {
  id: string;
  companyId: string;
  name: string;
  email: string;
  cpf: string | null;
  role: UserRole;
  orgUnitId: string | null;
  status: 'PENDING_SETUP' | 'ACTIVATED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  activatedAt: string | null;
  activationDelivery?: ApiInviteActivationDelivery;
}

export interface ApiInviteDeliveryAttempt {
  id: string;
  inviteId: string;
  channel: 'manual' | 'email';
  provider: 'noop' | 'smtp';
  status: 'manual_delivery_pending' | 'sent' | 'failed';
  errorCode: string | null;
  requestedByUserId: string;
  sentAt: string | null;
  createdAt: string;
}

export interface ApiInviteActivationDelivery {
  status: 'manual_delivery_pending' | 'sent' | 'failed';
  channel: 'manual' | 'email';
  provider: 'noop' | 'smtp';
  sent: boolean;
  lastAttempt: ApiInviteDeliveryAttempt | null;
}

export interface ApiSessionView {
  id: string;
  createdAt: string;
  expiresAt: string;
  refreshExpiresAt: string;
}

export interface ApiSessionBundle {
  accessToken: string;
  accessTokenExpiresAt: string;
  session: ApiSessionView;
  user: ApiUserView;
  company: ApiCompanyAuthenticatedView;
}

export interface ApiMeView {
  user: ApiUserView;
  company: ApiCompanyAuthenticatedView;
}

export interface ApiOrgTopLevel {
  id: string;
  name: string;
  levelIndex: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrgUnit {
  id: string;
  name: string;
  code: string | null;
  topLevelId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStructureTreeNode {
  id: string;
  type: 'top-level' | 'unit';
  name: string;
  levelIndex: number | null;
  children: ApiStructureTreeNode[];
}

export interface ApiStructure {
  companyId: string;
  orgLevels: string[];
  orgUnitName: string;
  topLevels: ApiOrgTopLevel[];
  units: ApiOrgUnit[];
  tree: ApiStructureTreeNode[];
}

export interface ApiAdminUsersList {
  users: ApiUserView[];
  invites: ApiInviteView[];
  meta: {
    page: number;
    limit: number;
    totalUsers: number;
    totalInvites: number;
    status: 'ALL' | ApiUserStatus;
    search: string | null;
  };
}

// ─── Phase 2: Repositories, Contents, Categories, Simple Links ───────────────

export interface ApiRepository {
  id: string;
  companyId: string;
  name: string;
  description: string;
  type: 'FULL' | 'SIMPLE' | 'PLAYLIST' | 'VIDEO_PLAYLIST';
  coverImage: string | null;
  bannerImage: string | null;
  bannerPosition: number | null;
  bannerBrightness: number | null;
  featured: boolean;
  showInLanding: boolean;
  status: 'ACTIVE' | 'DRAFT';
  accessType: 'ALL' | 'RESTRICTED';
  allowedUserIds: string[];
  allowedRegionIds: string[];
  allowedStoreIds: string[];
  excludedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiCategory {
  id: string;
  repositoryId: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiContent {
  id: string;
  companyId: string;
  repositoryId: string;
  categoryId: string | null;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  type: 'PDF' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'MUSIC' | 'IMAGE' | 'QUIZ';
  url: string;
  embedUrl: string | null;
  featured: boolean;
  recent: boolean;
  status: 'ACTIVE' | 'DRAFT';
  createdAt: string;
  updatedAt: string;
}

export interface ApiSimpleLink {
  id: string;
  companyId: string;
  repositoryId: string;
  name: string;
  url: string;
  type: string;
  date: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface ApiRepositoryCatalog {
  repository: ApiRepository;
  categories: ApiCategory[];
  contents: ApiContent[];
  simpleLinks: ApiSimpleLink[];
}

// ─── Phase 2: Metrics ────────────────────────────────────────────────────────

export interface ApiContentViewMetric {
  id: string;
  userId: string | null;
  contentId: string;
  companyId: string;
  repositoryId: string;
  contentType: string;
  orgUnitId: string | null;
  createdAt: string;
}

export interface ApiContentRating {
  id: string;
  userId: string | null;
  contentId: string;
  companyId: string;
  repositoryId: string;
  rating: number;
  orgUnitId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRepositoryMetrics {
  repositoryId: string;
  totalViews: number;
  totalRatings: number;
  averageRating: number;
  contents: Array<{
    contentId: string;
    title: string;
    views: number;
    averageRating: number | null;
  }>;
}

export interface ApiContentMetricSummary {
  contentId: string;
  repositoryId: string;
  viewsCount: number;
  ratingsCount: number;
  averageRating: number | null;
  currentUserRating?: number | null;
}

export interface ApiVisibleUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  orgUnitId: string | null;
}

// ─── Phase 2: Landing (Public) ───────────────────────────────────────────────

export interface ApiLandingData {
  companyId: string;
  name: string;
  slug: string;
  branding: ApiCompanyBranding;
  landingPageActive?: boolean;
  landingPageEnabled?: boolean;
  landingPageLayout?: string | null;
}

export interface ApiPublicRepository {
  id: string;
  name: string;
  description: string;
  type: 'FULL' | 'SIMPLE' | 'PLAYLIST' | 'VIDEO_PLAYLIST';
  coverImage: string | null;
  featured: boolean;
  status: 'ACTIVE' | 'DRAFT';
}

export interface ApiPublicContent {
  id: string;
  repositoryId: string;
  categoryId: string | null;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  type: 'PDF' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'MUSIC' | 'IMAGE' | 'QUIZ';
  url: string;
  embedUrl: string | null;
  featured: boolean;
  recent: boolean;
  status: 'ACTIVE' | 'DRAFT';
}

export interface ApiPublicSimpleLink {
  id: string;
  repositoryId: string;
  name: string;
  url: string;
  type: string;
  date: string;
  status: 'ACTIVE' | 'INACTIVE';
}

// Phase 3: LMS / Courses

export interface ApiCourse {
  id: string;
  companyId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  coverImage: string | null;
  imageUrl: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  accessType: 'ALL' | 'RESTRICTED';
  allowedUserIds: string[];
  allowedRegionIds: string[];
  allowedStoreIds: string[];
  excludedUserIds: string[];
  targetAudience: string[];
  passingScore: number;
  diplomaTemplate: string;
  layoutTemplate?: CourseLayoutTemplate;
  moduleCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCourseModule {
  id: string;
  courseId: string;
  companyId: string | null;
  title: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCourseContent {
  id: string;
  companyId: string;
  moduleId: string;
  title: string;
  description: string;
  type: 'PDF' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'HTML';
  url: string;
  contentUrl: string | null;
  filePath: string | null;
  sizeBytes: number | null;
  htmlContent: string | null;
  orderIndex: number;
  hasQuiz?: boolean;
  quizzes?: Array<{ id: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCourseQuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface ApiCoursePhaseQuestion {
  id: string;
  moduleId: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'WORD_SEARCH' | 'ORDERING' | 'HOTSPOT' | 'FILE' | 'HANGMAN' | 'TEXT';
  configuration: unknown | null;
  imageUrl: string | null;
  explanation: string | null;
  orderIndex: number;
  options?: ApiCourseQuestionOption[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiCourseEnrollment {
  id: string;
  courseId: string;
  userId: string;
  companyId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';
  startedAt: string;
  completedAt: string | null;
  scorePercent: number | null;
  totalCorrect: number | null;
  totalQuestions: number | null;
  timeSpentSeconds: number | null;
  currentModuleId: string | null;
  currentContentId: string | null;
  createdAt: string;
  updatedAt: string;
  courses?: { id?: string; title: string; imageUrl?: string | null };
}

export interface ApiCourseAnswer {
  id: string;
  enrollmentId: string;
  questionId: string;
  selectedOptionId: string | null;
  completedAnswerId: string | null;
  complexAnswer: unknown | null;
  isCorrect: boolean;
  answeredAt: string;
}

export interface ApiCourseStats {
  totalEnrolled: number;
  totalCompleted: number;
  completionRate: number;
  avgScore: number;
  avgTimeSeconds: number;
  enrollments: ApiCourseEnrollment[];
}

export interface ApiCourseAnalytics {
  enrollments: ApiCourseEnrollment[];
  answers: ApiCourseAnswer[];
  questions: ApiCoursePhaseQuestion[];
}

export interface ApiCourseModuleStats {
  totalModules: number;
  totalContents: number;
}

export interface ApiQuiz {
  id: string;
  companyId: string | null;
  contentId: string | null;
  courseContentId: string | null;
  title: string | null;
  passingScore: number;
  timeLimit: number | null;
  shuffleQuestions: boolean;
  pointsReward: number;
  createdAt: string;
}

export interface ApiQuizOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface ApiQuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  explanation: string | null;
  sourceExcerpt: string | null;
  orderIndex: number;
  quizOptions?: ApiQuizOption[];
}

export interface ApiQuizAttempt {
  id: string;
  companyId: string;
  userId: string | null;
  quizId: string;
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  completedAt: string;
}

// Phase 4: Checklists

export type ApiChecklistStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type ApiChecklistQuestionType =
  | 'COMPLIANCE'
  | 'YES_NO'
  | 'MULTIPLE_CHOICE'
  | 'DATE'
  | 'TIME'
  | 'NUMBER'
  | 'TEXT'
  | 'RATING'
  | 'CHECK'
  | 'CHECKLIST_ITEM'
  | 'PHOTO'
  | 'SIGNATURE';
export type ApiChecklistSubmissionStatus = 'IN_PROGRESS' | 'COMPLETED';
export type ApiActionPlanStatus = 'PENDING' | 'RESOLVED' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface ApiChecklistFolder {
  id: string;
  companyId: string;
  name: string;
  color: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface ApiChecklist {
  id: string;
  companyId: string;
  folderId: string | null;
  title: string;
  description: string | null;
  accessType: 'ALL' | 'RESTRICTED';
  allowedUserIds: string[];
  allowedRegionIds: string[];
  allowedStoreIds: string[];
  excludedUserIds: string[];
  status: ApiChecklistStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface ApiChecklistSection {
  id: string;
  checklistId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  createdAt: string | null;
  updatedAt: string | null;
  questions?: ApiChecklistQuestion[];
}

export interface ApiChecklistQuestion {
  id: string;
  checklistId: string;
  sectionId: string | null;
  text: string;
  questionText?: string;
  type: ApiChecklistQuestionType;
  questionType?: ApiChecklistQuestionType;
  required: boolean;
  orderIndex: number;
  description: string | null;
  config: Record<string, unknown> | null;
  configuration?: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiChecklistSubmission {
  id: string;
  checklistId: string;
  userId: string;
  companyId: string;
  orgUnitId: string | null;
  status: ApiChecklistSubmissionStatus;
  startedAt: string;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  checklist?: { title: string } | Array<{ title: string }> | null;
  checklists?: { title: string } | Array<{ title: string }> | null;
}

export interface ApiChecklistAnswer {
  id: string;
  submissionId: string;
  questionId: string;
  value: string | null;
  note: string | null;
  notes?: string | null;
  actionPlan: string | null;
  actionPlanCreatedBy: string | null;
  assignedUserId: string | null;
  photoUrls: string[];
  actionPlanDueDate: string | null;
  actionPlanStatus: ApiActionPlanStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
  checklistSubmissions?: ApiChecklistSubmission | null;
  checklistQuestions?: {
    text: string;
    questionText?: string;
    type?: string;
    questionType?: string;
    sectionId?: string | null;
    checklistId?: string;
  } | null;
}

export interface ApiChecklistDetail {
  checklist: ApiChecklist;
  sections: ApiChecklistSection[];
  questions: ApiChecklistQuestion[];
}

export interface ApiChecklistSubmissionDetail {
  submission: ApiChecklistSubmission;
  checklist?: ApiChecklist;
  sections?: ApiChecklistSection[];
  questions?: ApiChecklistQuestion[];
  answers: ApiChecklistAnswer[];
}

export interface ApiChecklistDashboard {
  submissions: ApiChecklistSubmission[];
  answers: ApiChecklistAnswer[];
  questions: ApiChecklistQuestion[];
  detailedAnswers: ApiChecklistAnswer[];
  actionPlans: ApiChecklistAnswer[];
}

// Phase 5: Surveys

export type ApiSurveyStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type ApiSurveyAccessType = 'ALL' | 'RESTRICTED';
export type ApiSurveyQuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'RATING'
  | 'NPS'
  | 'DATE'
  | 'NUMBER'
  | 'YES_NO';

export interface ApiSurvey {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  status: ApiSurveyStatus;
  accessType: ApiSurveyAccessType;
  allowedUserIds: string[];
  allowedRegionIds: string[];
  allowedStoreIds: string[];
  excludedUserIds: string[];
  allowMultipleResponses: boolean;
  anonymous: boolean;
  startsAt: string | null;
  endsAt: string | null;
  coverImage: string | null;
  createdBy: string | null;
  questionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSurveyQuestion {
  id: string;
  surveyId: string;
  questionText: string;
  description: string | null;
  questionType: ApiSurveyQuestionType;
  configuration: unknown;
  required: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSurveyResponse {
  id: string;
  surveyId: string;
  companyId: string;
  userId: string | null;
  orgUnitId: string | null;
  orgTopLevelId: string | null;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    orgUnitId: string | null;
  } | null;
  orgUnit: { id: string; name: string } | null;
  orgTopLevel: { id: string; name: string } | null;
}

export interface ApiSurveyAnswer {
  id: string;
  responseId: string;
  questionId: string;
  value: unknown;
  createdAt: string;
}
