/**
 * Recebe os e-mails da newsletter do site e grava numa aba "Newsletter"
 * da planilha onde este script estiver vinculado.
 *
 * Setup:
 * 1. Crie (ou abra) a planilha do Google Sheets que vai guardar os e-mails.
 * 2. No menu, vá em Extensões > Apps Script.
 * 3. Apague o conteúdo padrão do editor e cole este arquivo inteiro.
 * 4. Clique em Implantar > Nova implantação > tipo "Aplicativo da Web".
 *    - Executar como: Eu (sua conta)
 *    - Quem pode acessar: Qualquer pessoa
 * 5. Autorize as permissões pedidas (é a sua própria planilha).
 * 6. Copie a URL do Web App gerada e cole na variável SHEETS_ENDPOINT
 *    do arquivo .env deste projeto (nunca no frontend).
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Newsletter')
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Newsletter');

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Data', 'E-mail']);
  }

  var email = '';
  try {
    var data = JSON.parse(e.postData.contents);
    email = (data.email || '').trim();
  } catch (err) {
    email = (e.parameter.email || '').trim();
  }

  if (!email) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'email vazio' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  sheet.appendRow([new Date(), email]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
