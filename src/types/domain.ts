import type { Enums, Tables, TablesInsert, TablesUpdate } from './database'

export type Profile = Tables<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>
export type VisibilitySettings = Tables<'profile_visibility_settings'>
export type VisibilityUpdate = TablesUpdate<'profile_visibility_settings'>
export type Experience = Tables<'experiences'>
export type ExperienceInsert = TablesInsert<'experiences'>
export type ExperienceBullet = Tables<'experience_bullets'>
export type Education = Tables<'education'>
export type Certification = Tables<'certifications'>
export type Skill = Tables<'skills'>
export type Reference = Tables<'references'>
export type UploadedDocument = Tables<'uploaded_documents'>
export type JobApplication = Tables<'job_applications'>
export type JobRequirement = Tables<'job_requirements'>
export type JobAnalysisRun = Tables<'job_analysis_runs'>
export type TailoredCv = Tables<'tailored_cvs'>
export type CvVersion = Tables<'cv_versions'>
export type AiSuggestion = Tables<'ai_suggestions'>
export type ConfirmationQuestion = Tables<'confirmation_questions'>
export type ExportRecord = Tables<'exports'>
export type ApplicationNote = Tables<'application_notes'>
export type TemplatePreferences = Tables<'template_preferences'>

export type VerificationStatus = Enums<'verification_status'>
export type RecordSource = Enums<'record_source'>
export type ApplicationStatus = Enums<'application_status'>
export type RequirementKind = Enums<'requirement_kind'>
export type RequirementPriority = Enums<'requirement_priority'>
export type AlignmentStatus = Enums<'alignment_status'>
export type SuggestionStatus = Enums<'suggestion_status'>
export type CvStatus = Enums<'cv_status'>
export type SkillKind = Enums<'skill_kind'>

export type ExperienceWithBullets = Experience & {
  experience_bullets: ExperienceBullet[]
}
