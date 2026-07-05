const API = '/api';

async function jsonFetch(url, opts = {}){
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

// Index page: list posts
async function loadPosts(q){
  const container = document.getElementById('posts');
  if (!container) return;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  const data = await jsonFetch(`${API}/posts?${params.toString()}`);
  container.innerHTML = '';
  data.posts.forEach(p => {
    const el = document.createElement('div'); el.className = 'post-card';
    el.innerHTML = `<h3><a href='/post.html?id=${p._id}'>${p.title}</a></h3>
      <div>by ${p.author.username} • ${new Date(p.createdAt).toLocaleString()}</div>
      <p>${p.content.slice(0,200)}...</p>`;
    container.appendChild(el);
  });
}

// Single post page
async function loadSingle(){
  const id = new URL(location.href).searchParams.get('id');
  if (!id) return;
  const el = document.getElementById('post');
  const post = await jsonFetch(`${API}/posts/${id}`);
  el.innerHTML = `<h1>${post.title}</h1><div>by ${post.author.username}</div><div>${post.content.replace(/\n/g,'<br>')}</div>`;
  // load comments
  const comments = await jsonFetch(`${API}/posts/${id}/comments`);
  const commentsEl = document.getElementById('comments');
  commentsEl.innerHTML = `<h3>Comments</h3>` + comments.map(c => `<div><strong>${c.author.username}</strong>: ${c.content}</div>`).join('');
  // add comment form if logged
  const token = localStorage.getItem('token');
  const add = document.getElementById('add-comment');
  if (token) {
    add.innerHTML = `<form id='cform'><textarea name='content' rows=3 required></textarea><button>Comment</button></form>`;
    add.querySelector('#cform').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const content = e.target.content.value;
      await jsonFetch(`${API}/posts/${id}/comments`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body:JSON.stringify({ content }) });
      location.reload();
    });
  }
}

// Signup/login
function bindAuthForms(){
  const sform = document.getElementById('signup-form');
  if (sform) sform.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(sform);
    const body = { username: fd.get('username'), email: fd.get('email'), password: fd.get('password') };
    const res = await jsonFetch(`${API}/auth/signup`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    localStorage.setItem('token', res.token);
    location.href = '/';
  });
  const lform = document.getElementById('login-form');
  if (lform) lform.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(lform);
    const body = { email: fd.get('email'), password: fd.get('password') };
    const res = await jsonFetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    localStorage.setItem('token', res.token);
    location.href = '/';
  });
}

// New post form
function bindPostForm(){
  const form = document.getElementById('post-form');
  if (!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const body = { title: fd.get('title'), content: fd.get('content'), categories: (fd.get('categories')||'').split(',').map(s=>s.trim()).filter(Boolean) };
    const token = localStorage.getItem('token');
    if (!token) return alert('Please login');
    await jsonFetch(`${API}/posts`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body:JSON.stringify(body) });
    location.href = '/';
  });
}

// Search box
function bindSearch(){
  const s = document.getElementById('search');
  if (!s) return;
  s.addEventListener('keypress', (e)=>{
    if (e.key === 'Enter') loadPosts(s.value);
  });
}

// Router-ish
document.addEventListener('DOMContentLoaded', ()=>{
  bindAuthForms(); bindPostForm(); bindSearch();
  if (location.pathname === '/' || location.pathname === '/index.html') loadPosts();
  if (location.pathname.endsWith('/post.html')) loadSingle();
});
