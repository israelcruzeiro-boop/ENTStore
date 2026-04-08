-- Create checklist_folders table
CREATE TABLE IF NOT EXISTS public.checklist_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#2563EB',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on checklist_folders
ALTER TABLE public.checklist_folders ENABLE ROW LEVEL SECURITY;

-- Policy: Admin and Users can select checklist folders of their company
CREATE POLICY "Users can view checklist folders of their company" ON public.checklist_folders
    FOR SELECT
    USING (company_id = public.get_auth_user_company_id());

-- Policy: Admins can insert/update/delete checklist folders
CREATE POLICY "Admins can insert checklist folders" ON public.checklist_folders
    FOR INSERT
    WITH CHECK (
        company_id = public.get_auth_user_company_id() AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Admins can update checklist folders" ON public.checklist_folders
    FOR UPDATE
    USING (
        company_id = public.get_auth_user_company_id() AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Admins can delete checklist folders" ON public.checklist_folders
    FOR DELETE
    USING (
        company_id = public.get_auth_user_company_id() AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Add folder_id to checklists
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.checklist_folders(id) ON DELETE SET NULL;

-- Notify Supabase Realtime (optional but recommended for UX)
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_folders;
