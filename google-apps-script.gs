/**
 * Guarda os assinantes da newsletter numa aba "Newsletter" da planilha
 * onde este script estiver vinculado. Colunas: Data | E-mail | Status.
 *
 * Ações aceitas no POST (JSON): subscribe, unsubscribe, list e vote.
 * "vote" soma um voto do "Você decide" da home numa aba "Votos"
 * (colunas: Enquete | sim | nao) e devolve a contagem atual.
 * Todas exigem o campo "secret" igual à propriedade SHARED_SECRET do script.
 *
 * Setup:
 * 1. Crie (ou abra) a planilha do Google Sheets que vai guardar os e-mails.
 * 2. No menu, vá em Extensões > Apps Script.
 * 3. Apague o conteúdo padrão do editor e cole este arquivo inteiro.
 * 4. Em Configurações do projeto > Propriedades do script, crie
 *    SHARED_SECRET com um valor longo e aleatório (o mesmo do .env).
 * 5. Clique em Implantar > Nova implantação > tipo "Aplicativo da Web".
 *    - Executar como: Eu (sua conta)
 *    - Quem pode acessar: Qualquer pessoa
 * 6. Autorize as permissões pedidas (é a sua própria planilha).
 * 7. Copie a URL do Web App gerada e cole em SHEETS_ENDPOINT no .env
 *    deste projeto (nunca no frontend).
 *
 * Se você alterar este arquivo depois, crie uma nova versão da implantação.
 */
var SHEET_NAME = 'Newsletter';
var HEADER = ['Data', 'E-mail', 'Status'];
var ACTIVE = 'ativo';
var UNSUBSCRIBED = 'descadastrado';

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
  } else if (sheet.getRange(1, 3).getValue() !== 'Status') {
    // Migra a planilha antiga (Data | E-mail): marca todos como ativos.
    sheet.getRange(1, 3).setValue('Status');
    var rows = sheet.getLastRow() - 1;
    if (rows > 0) {
      sheet.getRange(2, 3, rows, 1).setValue(ACTIVE);
    }
  }
  return sheet;
}

// Retorna o número da linha do e-mail (2+), ou 0 se não existir.
function findRow_(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var emails = sheet.getRange(2, 2, last - 1, 1).getValues();
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === email) return i + 2;
  }
  return 0;
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'json inválido' });
  }

  var secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if (!secret || data.secret !== secret) {
    return json_({ ok: false, error: 'não autorizado' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var action = data.action || 'subscribe';

    if (action === 'vote') {
      return json_(vote_(String(data.poll || ''), String(data.choice || '')));
    }

    var sheet = getSheet_();

    if (action === 'list') {
      var last = sheet.getLastRow();
      var emails = [];
      if (last >= 2) {
        var rows = sheet.getRange(2, 2, last - 1, 2).getValues();
        for (var i = 0; i < rows.length; i++) {
          if (rows[i][1] === ACTIVE) emails.push(String(rows[i][0]).trim());
        }
      }
      return json_({ ok: true, emails: emails });
    }

    var email = String(data.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      return json_({ ok: false, error: 'e-mail inválido' });
    }

    var row = findRow_(sheet, email);

    if (action === 'subscribe') {
      if (row) {
        // Já existe: reativa se tinha cancelado, senão não duplica.
        sheet.getRange(row, 3).setValue(ACTIVE);
      } else {
        sheet.appendRow([new Date(), email, ACTIVE]);
      }
      return json_({ ok: true });
    }

    if (action === 'unsubscribe') {
      if (row) sheet.getRange(row, 3).setValue(UNSUBSCRIBED);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'ação desconhecida' });
  } finally {
    lock.releaseLock();
  }
}

// Soma um voto e devolve { ok, sim, nao } da enquete.
function vote_(poll, choice) {
  if (!/^[a-z0-9-]{1,20}$/.test(poll) || (choice !== 'sim' && choice !== 'nao')) {
    return { ok: false, error: 'voto inválido' };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Votos') || ss.insertSheet('Votos');
  if (sheet.getLastRow() === 0) sheet.appendRow(['Enquete', 'sim', 'nao']);
  var last = sheet.getLastRow();
  var row = 0;
  if (last >= 2) {
    var polls = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < polls.length; i++) {
      if (String(polls[i][0]) === poll) { row = i + 2; break; }
    }
  }
  if (!row) {
    sheet.appendRow([poll, 0, 0]);
    row = sheet.getLastRow();
  }
  var col = choice === 'sim' ? 2 : 3;
  var cell = sheet.getRange(row, col);
  cell.setValue(Number(cell.getValue() || 0) + 1);
  var counts = sheet.getRange(row, 2, 1, 2).getValues()[0];
  return { ok: true, sim: Number(counts[0]) || 0, nao: Number(counts[1]) || 0 };
}
