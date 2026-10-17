document.querySelectorAll('.subscribe-form').forEach((form) => {
  const status = form.querySelector('.subscribe-status');
  const button = form.querySelector('button[type="submit"]');
  const label = button.innerHTML;

  const show = (message, kind) => {
    status.textContent = message;
    status.dataset.kind = kind;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.elements.email.value.trim();

    if (!form.elements.email.checkValidity() || !email) {
      show('Digite um e-mail válido.', 'error');
      form.elements.email.focus();
      return;
    }

    button.disabled = true;
    button.textContent = 'Enviando…';
    show('', '');

    try {
      const res = await fetch((document.documentElement.dataset.api || '') + '/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website: form.elements.website.value }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        form.reset();
        show('Pronto! Você vai receber os próximos registros no seu e-mail.', 'success');
      } else {
        show(data.error || 'Não foi possível concluir agora. Tente novamente.', 'error');
      }
    } catch {
      show('Sem conexão com o servidor. Tente novamente.', 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = label;
    }
  });
});
