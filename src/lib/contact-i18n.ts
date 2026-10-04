import type { Locale } from './i18n';

const messages = {
  title: ['联系 Phil', 'Contact Phil', 'Phil へのお問い合わせ', 'Phil에게 연락하기'],
  intro: ['欢迎分享你对茶器与展览的想法，也可提出资料更正或博物馆交流建议。', 'Share your thoughts on teaware and the exhibition, suggest a correction, or discuss museum resources.', '茶器や展覧会についてのご感想、情報の訂正、博物館資料についてのご相談をお寄せください。', '차 도구와 전시에 대한 의견, 자료 수정 또는 박물관 자료에 관한 제안을 보내주세요.'],
  name: ['姓名', 'Name', 'お名前', '이름'],
  email: ['电子邮箱', 'Email', 'メールアドレス', '이메일'],
  message: ['留言内容', 'Message', 'お問い合わせ内容', '메시지'],
  required: ['所有字段均为必填。', 'All fields are required.', 'すべての項目は必須です。', '모든 항목은 필수입니다.'],
  hint: ['请填写 10 至 5,000 个字符；请勿发送密码或敏感个人资料。', 'Use 10–5,000 characters. Please do not include passwords or sensitive personal information.', '10〜5,000文字でご記入ください。パスワードや機密性の高い個人情報は送信しないでください。', '10~5,000자로 작성해주세요. 비밀번호나 민감한 개인정보를 보내지 마세요.'],
  submit: ['发送留言', 'Send message', '送信する', '메시지 보내기'],
  sending: ['正在发送…', 'Sending…', '送信中…', '보내는 중…'],
  success: ['留言已提交，谢谢！', 'Your message has been submitted. Thank you!', '送信が完了しました。ありがとうございます。', '메시지가 제출되었습니다. 감사합니다!'],
  failure: ['暂时无法确认发送成功。内容已保留，请稍后重试。', 'We could not confirm submission. Your message is preserved; please try again later.', '送信を確認できませんでした。内容は保持されています。後ほど再度お試しください。', '제출을 확인할 수 없습니다. 내용은 유지됩니다. 나중에 다시 시도해주세요.'],
  unavailable: ['联系表单暂未开放，请稍后再来。', 'The contact form is not available yet. Please check back later.', 'お問い合わせフォームはまだご利用いただけません。後ほどご確認ください。', '문의 양식은 아직 이용할 수 없습니다. 나중에 다시 확인해주세요.'],
  invalid: ['请检查标出的字段。', 'Please check the highlighted fields.', '表示された項目をご確認ください。', '표시된 항목을 확인해주세요.'],
  invalidName: ['请输入姓名（最多 80 个字符）。', 'Enter your name (up to 80 characters).', 'お名前を80文字以内でご記入ください。', '이름을 80자 이내로 입력해주세요.'],
  invalidEmail: ['请输入有效电子邮箱（最多 254 个字符）。', 'Enter a valid email address (up to 254 characters).', '有効なメールアドレスを254文字以内でご記入ください。', '올바른 이메일 주소를 254자 이내로 입력해주세요.'],
  invalidMessage: ['留言需包含 10 至 5,000 个字符。', 'Your message must contain 10–5,000 characters.', 'お問い合わせ内容は10〜5,000文字でご記入ください。', '메시지는 10~5,000자여야 합니다.'],
  next: ['发送后将打开 FormSubmit 页面，请完成 Google 验证码。若遇到错误，可返回此页重试。', 'Sending opens FormSubmit. Please complete the Google CAPTCHA. If an error occurs, return here to retry.', '送信後は FormSubmit のページで Google の認証を完了してください。エラーが発生した場合はこのページに戻ってお試しください。', '전송하면 FormSubmit 페이지가 열립니다. Google 인증을 완료해주세요. 오류가 발생하면 이 페이지로 돌아와 다시 시도해주세요.'],
  privacy: ['你的姓名、邮箱和留言会由 FormSubmit 处理，保存 30 天，并转发至 Phil 的 Gmail，以便回应这次联系。Google reCAPTCHA 用于防止垃圾提交。', 'FormSubmit processes your name, email, and message, retains submissions for 30 days, and forwards them to Phil’s Gmail to respond to your enquiry. Google reCAPTCHA helps prevent spam.', 'FormSubmit はお名前、メールアドレス、お問い合わせ内容を処理し、30日間保存して Phil の Gmail に転送します。迷惑送信対策として Google reCAPTCHA を使用します。', 'FormSubmit은 이름, 이메일과 메시지를 처리하고 30일 동안 보관한 후 문의에 응답할 수 있도록 Phil의 Gmail로 전달합니다. Google reCAPTCHA는 스팸 방지에 사용됩니다.'],
  formPrivacy: ['FormSubmit 隐私与条款', 'FormSubmit privacy & terms', 'FormSubmit のプライバシーと規約', 'FormSubmit 개인정보 및 약관'],
  googlePrivacy: ['Google 隐私政策', 'Google privacy', 'Google のプライバシー', 'Google 개인정보처리방침'],
  googleTerms: ['Google 使用条款', 'Google terms', 'Google の利用規約', 'Google 이용약관'],
};
export function contactText(locale: Locale, key: keyof typeof messages): string {
  return messages[key][(['zh', 'en', 'ja', 'ko'] as const).indexOf(locale)];
}
