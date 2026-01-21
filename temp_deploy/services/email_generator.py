from typing import Dict

class EmailGenerator:
    def __init__(self):
        self.use_ai = False
        self.model = None
        self.tokenizer = None

    def load_model(self):
        """Load the model - now optional, uses templates by default"""
        try:
            # Try to load transformers if available
            from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
            import torch
            
            self.model_name = "google/flan-t5-base"
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            
            print("Loading email generation model...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.use_ai = True
            print(f"Model loaded on {self.device}")
        except ImportError:
            print("Transformers not available - using template-based email generation")
            self.use_ai = False
        except Exception as e:
            print(f"Could not load AI model: {e} - using templates")
            self.use_ai = False

    def generate_email(self, job_data: Dict, contact_data: Dict, template: str = None) -> Dict:
        """
        Generate a professional recruitment email

        Args:
            job_data: Dictionary with job_title, company_name, job_url
            contact_data: Dictionary with name, title, email
            template: Optional custom template

        Returns:
            Dictionary with 'subject' and 'body'
        """
        job_title = job_data.get('job_title', 'position')
        company_name = job_data.get('company_name', 'your company')
        contact_name = contact_data.get('name', 'there')
        contact_title = contact_data.get('title', '')

        # Create a professional subject line
        subject = f"Top Talent Available for {job_title} at {company_name}"

        # If using custom template
        if template:
            body = template.format(
                contact_name=contact_name,
                contact_title=contact_title,
                job_title=job_title,
                company_name=company_name
            )
            return {'subject': subject, 'body': body}

        # Try AI generation if available
        if self.use_ai and self.model is not None:
            try:
                body = self._generate_with_ai(contact_name, contact_title, job_title, company_name)
                if body and len(body) > 50:
                    return {'subject': subject, 'body': body}
            except Exception as e:
                print(f"AI generation failed: {e}")

        # Fallback to professional template
        body = self._get_default_template(contact_name, contact_title, job_title, company_name)
        
        return {
            'subject': subject,
            'body': body
        }

    def _generate_with_ai(self, contact_name: str, contact_title: str,
                          job_title: str, company_name: str) -> str:
        """Generate email using AI model"""
        import torch
        
        prompt = f"""Write a professional recruitment email to {contact_name}, {contact_title} at {company_name}.
We are a recruitment agency and we noticed they have an opening for {job_title}.
We want to offer our pre-vetted candidates. Keep it concise, professional, and compelling.
The email should:
- Be personalized and respectful
- Mention the specific position
- Offer value (we have qualified candidates ready)
- Include a clear call-to-action
- Be brief (under 150 words)

Email:"""

        inputs = self.tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        inputs = inputs.to(self.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_length=300,
                num_beams=4,
                temperature=0.7,
                do_sample=True,
                top_p=0.9
            )

        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

    def _get_default_template(self, contact_name: str, contact_title: str,
                              job_title: str, company_name: str) -> str:
        """Fallback professional template"""
        return f"""Dear {contact_name},

I hope this email finds you well. I noticed that {company_name} is currently hiring for a {job_title} position, and I wanted to reach out.

We are a specialized recruitment agency with a pool of pre-vetted, highly qualified candidates who are actively seeking opportunities in this field. Our candidates have been thoroughly screened and are ready for immediate placement.

I'd love to discuss how we can support your hiring needs and potentially save you time in finding the right talent for this role.

Would you be open to a brief conversation this week?

Best regards,
Recruitment Team"""

    def generate_from_custom_template(self, template_subject: str, template_body: str,
                                     job_data: Dict, contact_data: Dict) -> Dict:
        """
        Generate email using custom templates with variable substitution
        """
        variables = {
            'contact_name': contact_data.get('name', ''),
            'contact_title': contact_data.get('title', ''),
            'job_title': job_data.get('job_title', ''),
            'company_name': job_data.get('company_name', ''),
            'job_url': job_data.get('job_url', '')
        }

        try:
            subject = template_subject.format(**variables)
            body = template_body.format(**variables)
            return {'subject': subject, 'body': body}
        except KeyError as e:
            print(f"Template variable error: {e}")
            return self.generate_email(job_data, contact_data)
