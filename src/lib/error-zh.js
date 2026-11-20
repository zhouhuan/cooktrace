// Server-side error messages are authored in English (`res.json({ error })`
// across server/routes/*.js) and the API layer throws them verbatim. For the
// Simplified Chinese edition the UI must not surface raw English text, so
// api.js routes every error through here: known messages get a curated
// translation, unknown ones fall back to a status-aware generic line.
//
// The original message is preserved on err.raw for diagnostics.

const EXACT = new Map([
  // -- generic / common -----------------------------------------------
  ['Not found',                                     '未找到对应内容'],
  ['Invalid id',                                    '无效的编号'],
  ['Forbidden',                                     '没有权限执行此操作'],
  ['Admin only',                                    '此操作需要管理员权限'],
  ['Not authenticated',                            '请先登录'],
  ['Invalid CSRF token',                            '会话已过期，请刷新页面后重试'],
  ['Unknown config key',                            '未知的配置项'],

  // -- auth / accounts -------------------------------------------------
  ['Username and password required',                '请输入用户名和密码'],
  ['Invalid username or password',                  '用户名或密码不正确'],
  ['Too many login attempts. Try again in a few minutes.', '尝试次数过多，请几分钟后再试'],
  ['Too many login attempts for this account. Try again later.', '该账号尝试次数过多，请稍后再试'],
  ['Password login is disabled. Use Single Sign-On instead.', '密码登录已停用，请使用单点登录'],
  ['New password required',                         '请输入新密码'],
  ['Current password required',                    '请输入当前密码'],
  ['Current password is incorrect',                '当前密码不正确'],
  ['Invalid email address',                        '邮箱地址无效'],
  ['That email is already in use',                  '该邮箱已被使用'],
  ['An account with this email already exists. Sign in instead.', '该邮箱已注册，请直接登录'],
  ['Invalid role',                                  '无效的角色'],
  ['User not found',                                 '未找到该用户'],
  ['Invite not found',                               '未找到邀请'],
  ['Invalid or expired reset link',                  '重置链接无效或已过期'],
  ['Reset link has expired',                         '重置链接已过期'],
  ['Invalid or already used invite link',           '邀请链接无效或已被使用'],
  ['Invite link has expired',                       '邀请链接已过期'],
  ['Invalid or expired link',                       '链接无效或已过期'],
  ['Unknown token type',                            '未知的令牌类型'],
  ['Token and password required',                   '缺少令牌或密码'],
  ['Token, username and password required',         '缺少令牌、用户名或密码'],
  ['Cannot delete yourself',                        '不能删除自己的账号'],
  ['Cannot change your own role',                  '不能更改自己的角色'],
  ['Cannot delete the only admin account. Transfer admin to another user first.', '不能删除唯一的管理员账号，请先转移管理员权限'],
  ['Cannot demote the only admin. Promote another user to admin first.', '不能降级唯一的管理员，请先提升其他用户为管理员'],
  ['Change your own password in Settings > Profile.', '请前往「设置 → 个人资料」修改自己的密码'],
  ['You are already signed in. Use Settings to disable user management.', '你已登录，请在设置中关闭多用户管理'],
  ['Invalid recovery token.',                        '恢复令牌无效'],
  ['Too many wrong recovery tokens. Try again later, or use npm run reset-2fa on the server.', '恢复令牌错误次数过多，请稍后再试或联系服务器管理员重置两步验证'],

  // -- AI ----------------------------------------------------------------
  ['AI not configured on server. Set AI_API_KEY in environment.', '服务器未配置 AI，请设置 AI_API_KEY 环境变量'],
  ['role and content required',                     '消息格式不完整'],
  ['messages array required',                       '消息格式不完整'],

  // -- kitchens / sharing ------------------------------------------------
  ['Not a member of this kitchen',                  '你不是该厨房的成员'],
  ['User management required for Kitchens',        '使用厨房功能需要先开启多用户管理'],
  ['Name required (max 80 chars)',                  '请输入名称（不超过 80 字）'],
  ['Only the owner can delete this kitchen',        '只有厨房所有者才能删除'],
  ['Only the owner can change roles',               '只有厨房所有者才能更改角色'],
  ['Only the owner can add members',               '只有厨房所有者才能添加成员'],
  ['Only the owner can hand over a kitchen',        '只有厨房所有者才能转让厨房'],
  ['You already own this kitchen',                  '你已经是该厨房的所有者'],
  ['Owner cannot leave; delete the kitchen or transfer ownership first', '所有者不能直接退出，请先删除厨房或转让所有权'],
  ['username required',                             '请输入用户名'],

  // -- uploads / backups ---------------------------------------------------
  ['No file uploaded',                              '未选择要上传的文件'],
  ['File too large for the server. The default cap is 512 MB; bump IMPORT_ZIP_MAX_MB or check your reverse-proxy body limits (Nginx client_max_body_size, Cloudflare upload cap, etc.).', '文件超出服务器大小限制，请压缩后再试'],
]);

// Regular-expression rules for message shapes that repeat across routes
// (field validation etc.). The field name itself is dropped: it's English.
const PATTERNS = [
  [/^[\w.]+ required$/i,      '请求参数不完整'],
  [/^recipe not found$/i,     '未找到该菜谱'],
  [/^user not found$/i,       '未找到该用户'],
  [/^API error \d+$/i,        '请求失败，请稍后重试'],
];

const BY_STATUS = {
  400: '请求无效，请检查输入后重试',
  401: '请先登录',
  403: '没有权限执行此操作',
  404: '未找到对应内容',
  409: '操作冲突，请刷新后重试',
  413: '文件过大，请压缩后再试',
  429: '操作过于频繁，请稍后再试',
  502: '服务器网关错误，请稍后重试',
  503: '服务暂不可用，请稍后重试',
  504: '服务器响应超时，请稍后重试',
};

const GENERIC = '操作失败，请稍后重试';

/**
 * Translate an API error into Simplified Chinese. `raw` is the server's
 * English message (may be empty/undefined); `status` the HTTP status when
 * known. Always returns a Chinese string — never the raw English text.
 */
export function zhErrorMessage(raw, status) {
  const key = (raw || '').trim();
  if (key && EXACT.has(key)) return EXACT.get(key);
  if (key) {
    for (const [re, msg] of PATTERNS) if (re.test(key)) return msg;
  }
  if (status && BY_STATUS[status]) return BY_STATUS[status];
  return GENERIC;
}
