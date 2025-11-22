// تكوين Supabase
const SUPABASE_URL = "https://oshbvczwsxpimyneudeg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zaGJ2Y3p3c3hwaW15bmV1ZGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTA5MjQsImV4cCI6MjA3NDI4NjkyNH0.tzNQ_DCrZLSO2H-EgmtElOlG05__FFmpqU0vJ5ay7VU";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);