// VisePanda Profile Page
(function(){
const MSG = document.getElementById('profileMsg');
const NAME = document.getElementById('profileName');
const LANG = document.getElementById('langSelect');
const SAVE = document.getElementById('saveBtn');
const OLD_PW = document.getElementById('oldPassword');
const NEW_PW = document.getElementById('newPassword');
const CONFIRM_PW = document.getElementById('confirmPassword');

// Set language selector to current
LANG.value = localStorage.getItem('lang') || 'en';

function msg(text, type){
  MSG.className = 'profile-msg ' + type;
  MSG.textContent = text;
  MSG.style.display = 'block';
  setTimeout(() => { MSG.style.display = 'none'; }, 4000);
}

function getAuth(){
  try{
    const raw = localStorage.getItem('vp_auth');
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}

SAVE.addEventListener('click', async function(){
  const auth = getAuth();
  if(!auth || !auth.token){ msg('Please login first', 'error'); return; }

  SAVE.disabled = true;
  SAVE.textContent = 'Saving…';

  let hasError = false;

  // 1. Update profile name
  if(NAME.value.trim()){
    try{
      const r = await fetch('/api/profile', {
        method: 'PUT',
        headers: {'Authorization': 'Bearer ' + auth.token, 'Content-Type': 'application/json'},
        body: JSON.stringify({name: NAME.value.trim()})
      });
      if(!r.ok){ const d = await r.json(); msg(d.detail || 'Failed to save name', 'error'); hasError = true; }
    }catch(e){ msg('Network error saving profile', 'error'); hasError = true; }
  }

  // 2. Change password
  const oldPw = OLD_PW.value.trim();
  const newPw = NEW_PW.value.trim();
  const confirmPw = CONFIRM_PW.value.trim();
  if(oldPw || newPw || confirmPw){
    if(!oldPw){ msg('Enter current password', 'error'); hasError = true; }
    else if(newPw.length < 6){ msg('New password must be at least 6 characters', 'error'); hasError = true; }
    else if(newPw !== confirmPw){ msg('New passwords do not match', 'error'); hasError = true; }
    else{
      try{
        const r = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {'Authorization': 'Bearer ' + auth.token, 'Content-Type': 'application/json'},
          body: JSON.stringify({old_password: oldPw, new_password: newPw})
        });
        if(r.ok){
          msg('Password updated successfully', 'success');
          OLD_PW.value = ''; NEW_PW.value = ''; CONFIRM_PW.value = '';
        } else {
          const d = await r.json(); msg(d.detail || 'Failed to change password', 'error'); hasError = true;
        }
      }catch(e){ msg('Network error changing password', 'error'); hasError = true; }
    }
  }

  if(!hasError) msg('Profile saved', 'success');
  SAVE.disabled = false;
  SAVE.textContent = 'Save Changes';
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', function(e){
  e.preventDefault();
  localStorage.removeItem('vp_auth');
  window.location.href = '/';
});
})();
