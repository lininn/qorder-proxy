'use strict';

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('setup-form');
  var saveBtn = document.getElementById('save-btn');
  var closeBtn = document.getElementById('close-btn');
  var statusMsg = document.getElementById('status-msg');
  var savedInfo = document.getElementById('saved-info');
  var backendSelect = document.getElementById('backend');
  var tokenHint = document.getElementById('token-hint');
  var toggleTokenBtn = document.getElementById('toggle-token');
  var tokenInput = document.getElementById('token');

  // Load current config
  fetch('/api/setup/config')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.config) {
        var c = data.config;
        if (c.port) document.getElementById('port').value = c.port;
        if (c.backend) backendSelect.value = c.backend;
        if (c.token) tokenInput.value = c.token;
        if (c.timeoutMs) document.getElementById('timeoutMs').value = c.timeoutMs;
        if (c.reasoningEffort) document.getElementById('reasoningEffort').value = c.reasoningEffort;
        if (c.contextWindow) document.getElementById('contextWindow').value = c.contextWindow;
        if (c.maxOutputTokens) document.getElementById('maxOutputTokens').value = c.maxOutputTokens;
        updateTokenHint();
      }
    })
    .catch(function () {});

  // Toggle token visibility
  toggleTokenBtn.addEventListener('click', function () {
    var isPassword = tokenInput.type === 'password';
    tokenInput.type = isPassword ? 'text' : 'password';
    toggleTokenBtn.textContent = isPassword ? '🔒' : '👁';
  });

  // Update token hint based on backend
  backendSelect.addEventListener('change', updateTokenHint);

  function updateTokenHint() {
    var backend = backendSelect.value;
    if (backend === 'global') {
      tokenHint.textContent = 'Global 后端使用 QODER_PAT (通过 qodercli login 获取)';
    } else {
      tokenHint.textContent = 'CN 后端使用 QODERCN_PERSONAL_ACCESS_TOKEN';
    }
  }

  // Save config
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var config = {
      port: Number(document.getElementById('port').value) || 3000,
      host: '127.0.0.1',
      backend: backendSelect.value,
      token: tokenInput.value,
      timeoutMs: Number(document.getElementById('timeoutMs').value) || 300000,
      reasoningEffort: document.getElementById('reasoningEffort').value || '',
      contextWindow: document.getElementById('contextWindow').value || '',
      maxOutputTokens: document.getElementById('maxOutputTokens').value || '',
    };

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ 保存中...';
    statusMsg.style.display = 'none';

    fetch('/api/setup/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          statusMsg.className = 'status-msg success';
          statusMsg.textContent = '✅ 配置已保存！';
          statusMsg.style.display = 'block';

          // Update token display with redacted value
          if (data.config && data.config.token) {
            tokenInput.value = data.config.token;
          }

          // Show saved info
          savedInfo.style.display = 'block';
          var connectInfo = document.getElementById('connect-info');
          connectInfo.textContent = JSON.stringify({
            baseUrl: 'http://127.0.0.1:' + config.port + '/v1',
            apiKey: 'not-used'
          }, null, 2);

          // Show close button
          closeBtn.style.display = 'inline-flex';
          saveBtn.textContent = '✅ 已保存';
        } else {
          throw new Error(data.error || '保存失败');
        }
      })
      .catch(function (err) {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = '❌ 保存失败: ' + err.message;
        statusMsg.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 保存配置';
      });
  });

  // Close setup server
  closeBtn.addEventListener('click', function () {
    closeBtn.disabled = true;
    closeBtn.textContent = '⏳ 关闭中...';
    fetch('/api/setup/close', { method: 'POST' })
      .then(function () {
        document.body.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#22c55e;font-size:1.2rem">' +
          '<div style="text-align:center">' +
          '<div style="font-size:3rem;margin-bottom:1rem">✅</div>' +
          '<p>配置界面已关闭</p>' +
          '<p style="color:#888;font-size:0.9rem;margin-top:0.5rem">使用 <code>qorder-proxy start</code> 启动代理服务</p>' +
          '</div></div>';
      })
      .catch(function () {
        document.body.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#ef4444;font-size:1.2rem">' +
          '<p>关闭失败，请手动关闭此页面</p></div>';
      });
  });

  // Copy buttons
  document.querySelectorAll('.btn.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.dataset.target);
      if (!target) return;
      navigator.clipboard.writeText(target.textContent).then(function () {
        var original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = original; }, 1500);
      }).catch(function () {
        btn.textContent = 'Failed';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
      });
    });
  });
});
