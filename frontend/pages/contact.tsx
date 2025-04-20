import { useState } from 'react';
import Toast from '../src/components/Toast';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [showToast, setShowToast] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowToast(true);
    setForm({ name: '', email: '', message: '' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 text-gray-900">
      <section className="w-full bg-gradient-to-r from-blue-100 to-purple-100 border-b border-blue-200 py-10 px-4 text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 mb-3">Contact Us</h1>
        <p className="text-lg md:text-xl text-gray-700 mb-2 max-w-2xl mx-auto">Have a question, suggestion, or want to join our community? Fill out the form below or email us at <a href="mailto:team@pioneerpathways.com" className="text-blue-600 hover:underline">team@pioneerpathways.com</a>.</p>
      </section>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <form className="bg-white rounded-xl shadow-lg p-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label htmlFor="name" className="font-semibold text-gray-800">Name</label>
          <input id="name" name="name" type="text" required className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-400" value={form.name} onChange={handleChange} />
          <label htmlFor="email" className="font-semibold text-gray-800">Email</label>
          <input id="email" name="email" type="email" required className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-400" value={form.email} onChange={handleChange} />
          <label htmlFor="message" className="font-semibold text-gray-800">Message</label>
          <textarea id="message" name="message" rows={5} required className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-400" value={form.message} onChange={handleChange} />
          <button type="submit" className="btn-primary mt-4 px-8 py-3 rounded-full shadow hover:scale-105 focus:ring-2 focus:ring-blue-400 transition">
            Send Message
          </button>
        </form>
        <div className="text-center mt-8">
          <a href="/" className="btn-secondary px-8 py-3 rounded-full shadow hover:scale-105 focus:ring-2 focus:ring-purple-400 transition">
            ← Back to Home
          </a>
        </div>
        {showToast && <Toast message="Thank you for contacting us!" onClose={() => setShowToast(false)} />}
      </main>
    </div>
  );
}
