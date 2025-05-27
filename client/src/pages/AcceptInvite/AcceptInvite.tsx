import { useEffect, useState } from "react";

const AcceptInvite = () => {
    const [form, setForm] = useState({ name: '', password: '' });
    const token = new URLSearchParams(location.search).get('token');

    const handleSubmit = async () => {
        const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, token }),
        });

        if (res.ok) {
        // Redirect or log in user
        } else {
        alert('Invalid or expired invite');
        }
    };

    useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
        localStorage.setItem('inviteToken', token);
        window.location.href = '/api/login';
    }
    }, []);


  return (
    <form onSubmit={handleSubmit}>
      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <button type="submit">Accept Invite</button>
    </form>
  );
}

export default AcceptInvite