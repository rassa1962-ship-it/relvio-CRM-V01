-- Add missing contact_channel values to leads table
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_contact_channel_check;
ALTER TABLE leads ADD CONSTRAINT leads_contact_channel_check 
  CHECK (contact_channel IN ('telegram','vk','email','phone','in_app','other'));

-- Also update clients table if needed
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_contact_channel_check;
ALTER TABLE clients ADD CONSTRAINT clients_contact_channel_check 
  CHECK (contact_channel IN ('telegram','vk','email','phone','in_app','other'));
