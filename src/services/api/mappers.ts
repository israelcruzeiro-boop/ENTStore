import type {
  Category,
  Checklist,
  ChecklistAnswer,
  ChecklistFolder,
  ChecklistQuestion,
  ChecklistSection,
  ChecklistSubmission,
  Company,
  Content,
  ContentRating,
  ContentViewMetric,
  Course,
  CourseAnswer,
  CourseContent,
  CourseEnrollment,
  CourseModule,
  CoursePhaseQuestion,
  CourseQuestionOption,
  OrgTopLevel,
  OrgUnit,
  Quiz,
  QuizAttempt,
  QuizOption,
  QuizQuestion,
  Repository,
  SimpleLink,
  User,
} from '@/types';
import type {
  ApiCourse,
  ApiCourseAnswer,
  ApiCourseContent,
  ApiCourseEnrollment,
  ApiCourseModule,
  ApiCoursePhaseQuestion,
  ApiCourseQuestionOption,
  ApiCompanyAuthenticatedView,
  ApiCompanyPublicView,
  ApiQuiz,
  ApiQuizAttempt,
  ApiQuizOption,
  ApiQuizQuestion,
  ApiOrgTopLevel,
  ApiOrgUnit,
  ApiTenantBranding,
  ApiUserView,
  ApiRepository,
  ApiContent,
  ApiCategory,
  ApiSimpleLink,
  ApiContentViewMetric,
  ApiContentRating,
  ApiChecklist,
  ApiChecklistAnswer,
  ApiChecklistFolder,
  ApiChecklistQuestion,
  ApiChecklistSection,
  ApiChecklistSubmission,
  ApiPublicRepository,
  ApiPublicContent,
  ApiPublicSimpleLink,
} from './types';

function mapChecklistQuestionType(type: ApiChecklistQuestion['type']): ChecklistQuestion['type'] {
  if (type === 'YES_NO') return 'COMPLIANCE';
  if (type === 'CHECKLIST_ITEM') return 'CHECK';
  if (type === 'MULTIPLE_CHOICE' || type === 'PHOTO' || type === 'SIGNATURE') return 'TEXT';
  return type;
}

function mapActionPlanStatus(status: ApiChecklistAnswer['actionPlanStatus']): ChecklistAnswer['action_plan_status'] {
  if (!status) return undefined;
  return status === 'RESOLVED' || status === 'DONE' ? 'RESOLVED' : 'PENDING';
}

export const maskCPF = (cpf: string | null | undefined): string | undefined => {
  if (!cpf) return cpf ?? undefined;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length < 3) return clean;
  return `${clean.substring(0, 3)}.***.***-**`;
};

export function mapApiCompanyToFrontend(
  company: ApiCompanyAuthenticatedView | ApiCompanyPublicView,
): Company {
  const isAuthenticated = 'active' in company;
  const branding = company.branding;
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    link_name: company.linkName,
    active: isAuthenticated ? (company as ApiCompanyAuthenticatedView).active : true,
    theme: {
      primary: branding.theme.primary,
      secondary: branding.theme.secondary,
      background: branding.theme.surface,
      card: branding.theme.surface,
      text: branding.theme.text,
    },
    logo_url: branding.logoUrl ?? undefined,
    hero_image: branding.hero.imageUrl ?? undefined,
    hero_title: branding.hero.title,
    hero_subtitle: branding.hero.subtitle,
    landing_page_enabled: isAuthenticated ? (company as ApiCompanyAuthenticatedView).landingPageEnabled : undefined,
    landing_page_active: isAuthenticated ? (company as ApiCompanyAuthenticatedView).landingPageActive : undefined,
    landing_page_layout: isAuthenticated
      ? ((company as ApiCompanyAuthenticatedView).landingPageLayout as Company['landing_page_layout'])
      : undefined,
    checklists_enabled: isAuthenticated ? (company as ApiCompanyAuthenticatedView).features.checklists : undefined,
    org_levels: company.general.orgLevels.map((name, index) => ({
      id: String(index + 1),
      name,
    })),
    org_unit_name: company.general.orgUnitName,
    created_at: isAuthenticated ? (company as ApiCompanyAuthenticatedView).createdAt ?? '' : '',
    updated_at: isAuthenticated ? (company as ApiCompanyAuthenticatedView).updatedAt : undefined,
    deleted_at: isAuthenticated ? (company as ApiCompanyAuthenticatedView).deletedAt : undefined,
  };
}

export function mapTenantBrandingToCompany(tenant: ApiTenantBranding): Company {
  const branding = tenant.branding;
  return {
    id: tenant.companyId,
    name: tenant.name,
    slug: tenant.slug,
    link_name: tenant.linkName,
    active: true,
    theme: {
      primary: branding.theme.primary,
      secondary: branding.theme.secondary,
      background: branding.theme.surface,
      card: branding.theme.surface,
      text: branding.theme.text,
    },
    logo_url: branding.logoUrl ?? undefined,
    hero_image: branding.hero.imageUrl ?? undefined,
    hero_title: branding.hero.title,
    hero_subtitle: branding.hero.subtitle,
    org_levels: tenant.orgLevels.map((name, index) => ({
      id: String(index + 1),
      name,
    })),
    org_unit_name: tenant.orgUnitName,
    created_at: '',
  };
}

export function mapApiUserToFrontend(user: ApiUserView): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf_raw: user.cpf ?? undefined,
    cpf: maskCPF(user.cpf),
    role: user.role as User['role'],
    company_id: user.companyId,
    org_unit_id: user.orgUnitId ?? undefined,
    avatar_url: user.avatarUrl ?? undefined,
    active: user.active,
    first_access: user.firstAccess,
    onboarding_completed: user.onboardingCompleted,
    status: user.status,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

export function mapApiTopLevelToFrontend(
  topLevel: ApiOrgTopLevel,
  companyId: string,
): OrgTopLevel {
  return {
    id: topLevel.id,
    company_id: companyId,
    level_id: String(topLevel.levelIndex),
    parent_id: topLevel.parentId ?? undefined,
    name: topLevel.name,
    active: true,
    created_at: topLevel.createdAt,
    updated_at: topLevel.updatedAt,
  };
}

export function mapApiUnitToFrontend(unit: ApiOrgUnit, companyId: string): OrgUnit {
  return {
    id: unit.id,
    company_id: companyId,
    parent_id: unit.topLevelId ?? '',
    name: unit.name,
    active: unit.active,
    created_at: unit.createdAt,
    updated_at: unit.updatedAt,
  };
}

// ─── Phase 2 mappers ─────────────────────────────────────────────────────────

export function mapApiRepositoryToFrontend(repo: ApiRepository | ApiPublicRepository, companyId?: string): Repository {
  const full = repo as ApiRepository;
  return {
    id: repo.id,
    company_id: companyId ?? full.companyId ?? '',
    name: repo.name,
    description: repo.description,
    type: repo.type,
    cover_image: repo.coverImage ?? '',
    banner_image: full.bannerImage ?? undefined,
    banner_position: full.bannerPosition ?? undefined,
    banner_brightness: full.bannerBrightness ?? undefined,
    featured: repo.featured,
    show_in_landing: full.showInLanding ?? false,
    status: repo.status,
    access_type: full.accessType ?? 'ALL',
    allowed_user_ids: full.allowedUserIds ?? [],
    allowed_region_ids: full.allowedRegionIds ?? [],
    allowed_store_ids: full.allowedStoreIds ?? [],
    excluded_user_ids: full.excludedUserIds ?? [],
    created_at: full.createdAt ?? '',
    updated_at: full.updatedAt ?? '',
  };
}

export function mapApiContentToFrontend(content: ApiContent | ApiPublicContent, companyId?: string): Content {
  const full = content as ApiContent;
  return {
    id: content.id,
    company_id: companyId ?? full.companyId ?? '',
    repository_id: content.repositoryId,
    category_id: content.categoryId ?? undefined,
    title: content.title,
    description: content.description,
    thumbnail_url: content.thumbnailUrl ?? '',
    type: content.type,
    url: content.url,
    embed_url: full.embedUrl ?? undefined,
    featured: content.featured,
    recent: content.recent,
    status: content.status,
    created_at: full.createdAt ?? '',
    updated_at: full.updatedAt ?? '',
  };
}

export function mapApiCategoryToFrontend(cat: ApiCategory): Category {
  return {
    id: cat.id,
    repository_id: cat.repositoryId,
    name: cat.name,
    order_index: cat.orderIndex,
    created_at: cat.createdAt,
  };
}

export function mapApiSimpleLinkToFrontend(link: ApiSimpleLink | ApiPublicSimpleLink, companyId?: string, repositoryId?: string): SimpleLink {
  const full = link as ApiSimpleLink;
  return {
    id: link.id,
    company_id: companyId ?? full.companyId ?? '',
    repository_id: repositoryId ?? link.repositoryId,
    name: link.name,
    url: link.url,
    type: link.type,
    date: link.date,
    status: link.status,
    created_at: full.createdAt ?? '',
    updated_at: full.updatedAt ?? '',
  };
}

export function mapApiViewMetricToFrontend(m: ApiContentViewMetric): ContentViewMetric {
  return {
    id: m.id,
    user_id: m.userId,
    content_id: m.contentId,
    company_id: m.companyId,
    repository_id: m.repositoryId,
    content_type: m.contentType,
    org_unit_id: m.orgUnitId ?? undefined,
    viewed_at: m.createdAt,
  };
}

export function mapApiRatingToFrontend(r: ApiContentRating): ContentRating {
  return {
    id: r.id,
    user_id: r.userId,
    content_id: r.contentId,
    company_id: r.companyId,
    repository_id: r.repositoryId,
    rating: r.rating,
    org_unit_id: r.orgUnitId ?? undefined,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export function mapApiCourseToFrontend(course: ApiCourse): Course & { module_count?: number } {
  return {
    id: course.id,
    company_id: course.companyId,
    title: course.title,
    description: course.description,
    thumbnail_url: course.thumbnailUrl ?? undefined,
    cover_image: course.coverImage ?? undefined,
    image_url: course.imageUrl ?? course.thumbnailUrl ?? undefined,
    status: course.status,
    access_type: course.accessType,
    allowed_user_ids: course.allowedUserIds,
    allowed_region_ids: course.allowedRegionIds,
    allowed_store_ids: course.allowedStoreIds,
    excluded_user_ids: course.excludedUserIds,
    target_audience: course.targetAudience,
    passing_score: course.passingScore,
    diploma_template: course.diplomaTemplate,
    module_count: course.moduleCount ?? 0,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
  };
}

export function mapApiCourseModuleToFrontend(module: ApiCourseModule): CourseModule {
  return {
    id: module.id,
    course_id: module.courseId,
    company_id: module.companyId ?? undefined,
    title: module.title,
    order_index: module.orderIndex,
    created_at: module.createdAt,
    updated_at: module.updatedAt,
  };
}

export function mapApiCourseContentToFrontend(content: ApiCourseContent): CourseContent & { quizzes?: Array<{ id: string }> } {
  return {
    id: content.id,
    company_id: content.companyId,
    module_id: content.moduleId,
    title: content.title,
    description: content.description,
    type: content.type,
    url: content.url,
    content_url: content.contentUrl ?? undefined,
    file_path: content.filePath ?? undefined,
    size_bytes: content.sizeBytes ?? undefined,
    html_content: content.htmlContent ?? undefined,
    order_index: content.orderIndex,
    has_quiz: Boolean(content.hasQuiz || content.quizzes?.length),
    quizzes: content.quizzes ?? [],
    created_at: content.createdAt,
    updated_at: content.updatedAt,
  };
}

export function mapApiCourseQuestionOptionToFrontend(option: ApiCourseQuestionOption): CourseQuestionOption {
  return {
    id: option.id,
    question_id: option.questionId,
    option_text: option.optionText,
    is_correct: option.isCorrect,
    order_index: option.orderIndex,
  };
}

export function mapApiCourseQuestionToFrontend(question: ApiCoursePhaseQuestion): CoursePhaseQuestion {
  return {
    id: question.id,
    module_id: question.moduleId,
    question_text: question.questionText,
    question_type: question.questionType === 'TEXT' ? 'FILE' : question.questionType,
    configuration: question.configuration,
    image_url: question.imageUrl ?? undefined,
    explanation: question.explanation ?? undefined,
    order_index: question.orderIndex,
    options: (question.options ?? []).map(mapApiCourseQuestionOptionToFrontend),
    created_at: question.createdAt,
    updated_at: question.updatedAt,
  };
}

export function mapApiCourseEnrollmentToFrontend(enrollment: ApiCourseEnrollment): CourseEnrollment & { courses?: { id?: string; title: string; image_url?: string | null } } {
  return {
    id: enrollment.id,
    course_id: enrollment.courseId,
    user_id: enrollment.userId,
    company_id: enrollment.companyId,
    status: enrollment.status === 'DROPPED' ? 'IN_PROGRESS' : enrollment.status,
    started_at: enrollment.startedAt,
    completed_at: enrollment.completedAt ?? undefined,
    score_percent: enrollment.scorePercent ?? undefined,
    total_correct: enrollment.totalCorrect ?? undefined,
    total_questions: enrollment.totalQuestions ?? undefined,
    time_spent_seconds: enrollment.timeSpentSeconds ?? undefined,
    current_module_id: enrollment.currentModuleId ?? undefined,
    current_content_id: enrollment.currentContentId ?? undefined,
    created_at: enrollment.createdAt,
    updated_at: enrollment.updatedAt,
    courses: enrollment.courses
      ? {
          id: enrollment.courses.id,
          title: enrollment.courses.title,
          image_url: enrollment.courses.imageUrl ?? undefined,
        }
      : undefined,
  };
}

export function mapApiCourseAnswerToFrontend(answer: ApiCourseAnswer): CourseAnswer {
  return {
    id: answer.id,
    enrollment_id: answer.enrollmentId,
    question_id: answer.questionId,
    selected_option_id: answer.selectedOptionId ?? undefined,
    complex_answer: answer.complexAnswer,
    is_correct: answer.isCorrect,
    answered_at: answer.answeredAt,
  };
}

export function mapApiQuizToFrontend(quiz: ApiQuiz): Quiz {
  return {
    id: quiz.id,
    company_id: quiz.companyId ?? undefined,
    content_id: quiz.contentId ?? undefined,
    course_content_id: quiz.courseContentId ?? undefined,
    title: quiz.title ?? undefined,
    passing_score: quiz.passingScore,
    time_limit: quiz.timeLimit ?? undefined,
    shuffle_questions: quiz.shuffleQuestions,
    points_reward: quiz.pointsReward,
    created_at: quiz.createdAt,
  };
}

export function mapApiQuizOptionToFrontend(option: ApiQuizOption): QuizOption {
  return {
    id: option.id,
    question_id: option.questionId,
    option_text: option.optionText,
    is_correct: option.isCorrect,
    order_index: option.orderIndex,
  };
}

export function mapApiQuizQuestionToFrontend(question: ApiQuizQuestion): QuizQuestion {
  return {
    id: question.id,
    quiz_id: question.quizId,
    question_text: question.questionText,
    explanation: question.explanation ?? undefined,
    source_excerpt: question.sourceExcerpt ?? undefined,
    order_index: question.orderIndex,
    quiz_options: (question.quizOptions ?? []).map(mapApiQuizOptionToFrontend),
  };
}

export function mapApiQuizAttemptToFrontend(attempt: ApiQuizAttempt): QuizAttempt {
  return {
    id: attempt.id,
    company_id: attempt.companyId,
    user_id: attempt.userId,
    quiz_id: attempt.quizId,
    score: attempt.score,
    passed: attempt.passed,
    answers: attempt.answers,
    completed_at: attempt.completedAt,
  };
}

export function mapApiChecklistFolderToFrontend(folder: ApiChecklistFolder): ChecklistFolder {
  return {
    id: folder.id,
    company_id: folder.companyId,
    name: folder.name,
    color: folder.color ?? undefined,
    order_index: folder.orderIndex,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt ?? undefined,
  };
}

export function mapApiChecklistToFrontend(checklist: ApiChecklist): Checklist {
  return {
    id: checklist.id,
    company_id: checklist.companyId,
    folder_id: checklist.folderId ?? undefined,
    title: checklist.title,
    description: checklist.description ?? undefined,
    access_type: checklist.accessType,
    allowed_user_ids: checklist.allowedUserIds,
    allowed_region_ids: checklist.allowedRegionIds,
    allowed_store_ids: checklist.allowedStoreIds,
    excluded_user_ids: checklist.excludedUserIds,
    status: checklist.status,
    created_at: checklist.createdAt,
    updated_at: checklist.updatedAt ?? undefined,
  };
}

export function mapApiChecklistSectionToFrontend(section: ApiChecklistSection): ChecklistSection {
  return {
    id: section.id,
    checklist_id: section.checklistId,
    title: section.title,
    description: section.description ?? undefined,
    order_index: section.orderIndex,
    created_at: section.createdAt ?? undefined,
    updated_at: section.updatedAt ?? undefined,
  };
}

export function mapApiChecklistQuestionToFrontend(question: ApiChecklistQuestion): ChecklistQuestion {
  return {
    id: question.id,
    checklist_id: question.checklistId ?? '',
    section_id: question.sectionId ?? undefined,
    text: question.text ?? question.questionText ?? '',
    type: mapChecklistQuestionType(question.type ?? question.questionType ?? 'TEXT'),
    required: question.required,
    order_index: question.orderIndex,
    description: question.description ?? undefined,
    config: question.config ?? question.configuration ?? undefined,
    created_at: question.createdAt ?? undefined,
    updated_at: question.updatedAt ?? undefined,
  };
}

export function mapApiChecklistSubmissionToFrontend(submission: ApiChecklistSubmission): ChecklistSubmission {
  return {
    id: submission.id,
    checklist_id: submission.checklistId,
    user_id: submission.userId,
    company_id: submission.companyId,
    org_unit_id: submission.orgUnitId ?? undefined,
    status: submission.status,
    started_at: submission.startedAt,
    completed_at: submission.completedAt ?? undefined,
    created_at: submission.createdAt ?? undefined,
    updated_at: submission.updatedAt ?? undefined,
    checklist: submission.checklist ?? submission.checklists ?? undefined,
  };
}

export function mapApiChecklistAnswerToFrontend(answer: ApiChecklistAnswer): ChecklistAnswer & {
  checklist_submissions?: ReturnType<typeof mapApiChecklistSubmissionToFrontend>;
  checklist_questions?: {
    text: string;
    type?: string;
    section_id?: string | null;
    checklist_id?: string;
  };
} {
  return {
    id: answer.id,
    submission_id: answer.submissionId,
    question_id: answer.questionId,
    value: answer.value ?? undefined,
    note: answer.note ?? answer.notes ?? undefined,
    action_plan: answer.actionPlan ?? undefined,
    action_plan_created_by: answer.actionPlanCreatedBy ?? undefined,
    assigned_user_id: answer.assignedUserId ?? undefined,
    photo_urls: answer.photoUrls ?? [],
    action_plan_due_date: answer.actionPlanDueDate ?? undefined,
    action_plan_status: mapActionPlanStatus(answer.actionPlanStatus),
    created_at: answer.createdAt ?? undefined,
    updated_at: answer.updatedAt ?? undefined,
    checklist_submissions: answer.checklistSubmissions
      ? mapApiChecklistSubmissionToFrontend(answer.checklistSubmissions)
      : undefined,
    checklist_questions: answer.checklistQuestions
      ? {
          text: answer.checklistQuestions.text,
          type: answer.checklistQuestions.type ?? answer.checklistQuestions.questionType,
          section_id: answer.checklistQuestions.sectionId ?? null,
          checklist_id: answer.checklistQuestions.checklistId,
        }
      : undefined,
  };
}
