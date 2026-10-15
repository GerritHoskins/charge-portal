<?php
declare(strict_types=1);

// PHP twin of legacy/server.mjs: same routes, same cookie, same JSON contract, so the Nuxt
// app (and tests/e2e/contract.spec.ts) cannot tell them apart. Run with the built-in server:
//   php -S 0.0.0.0:8080 -t legacy-php/public legacy-php/public/index.php
// State lives in files (the built-in server forgets everything between requests); this is
// a stand-in, not production session handling.

const COOKIE = 'legacy_session';
const SESSION_TTL = 8 * 60 * 60;
const REASONS = ['wrong-amount', 'not-my-session', 'duplicate', 'other'];

$stateDir = (getenv('LEGACY_STATE_DIR') ?: sys_get_temp_dir() . '/legacy-php-state');
@mkdir($stateDir . '/sessions', 0700, true);

function seed_invoices(): array {
    return [
        ['id' => 'inv-0042', 'number' => 'RE-2026-0042', 'issuedAt' => '2026-10-01T00:00:00Z', 'amountCents' => 4210, 'currency' => 'EUR', 'status' => 'open'],
        ['id' => 'inv-0041', 'number' => 'RE-2026-0041', 'issuedAt' => '2026-09-01T00:00:00Z', 'amountCents' => 12875, 'currency' => 'EUR', 'status' => 'paid'],
        ['id' => 'inv-0040', 'number' => 'RE-2026-0040', 'issuedAt' => '2026-08-01T00:00:00Z', 'amountCents' => 9980, 'currency' => 'EUR', 'status' => 'open'],
    ];
}

$STATIONS = [
    ['id' => 'st-001', 'name' => 'Hauptbahnhof Nord', 'city' => 'Köln', 'status' => 'available', 'connectors' => 4, 'maxPowerKw' => 150],
    ['id' => 'st-002', 'name' => 'Rheinpark P2', 'city' => 'Köln', 'status' => 'charging', 'connectors' => 2, 'maxPowerKw' => 22],
    ['id' => 'st-003', 'name' => 'Depot Ehrenfeld', 'city' => 'Köln', 'status' => 'faulted', 'connectors' => 6, 'maxPowerKw' => 50],
    ['id' => 'st-004', 'name' => 'Messe Süd', 'city' => 'Nürnberg', 'status' => 'available', 'connectors' => 8, 'maxPowerKw' => 300],
    ['id' => 'st-005', 'name' => 'Logistikpark West', 'city' => 'Hamburg', 'status' => 'offline', 'connectors' => 2, 'maxPowerKw' => 22],
];
$SESSIONS = [
    ['id' => 'se-1001', 'stationId' => 'st-002', 'startedAt' => '2026-10-10T07:12:00Z', 'energyKwh' => 18.4, 'status' => 'running'],
    ['id' => 'se-1000', 'stationId' => 'st-001', 'startedAt' => '2026-10-09T16:40:00Z', 'energyKwh' => 42.1, 'status' => 'completed'],
    ['id' => 'se-0999', 'stationId' => 'st-004', 'startedAt' => '2026-10-09T09:05:00Z', 'energyKwh' => 63.8, 'status' => 'completed'],
];

function invoices_file(): string { global $stateDir; return $stateDir . '/invoices.json'; }
function load_invoices(): array {
    $raw = @file_get_contents(invoices_file());
    return $raw === false ? seed_invoices() : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
}
function save_invoices(array $invoices): void { file_put_contents(invoices_file(), json_encode($invoices), LOCK_EX); }

function respond_json(int $status, array $body): never {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}
function respond_html(int $status, string $html): never {
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    echo $html;
    exit;
}
function redirect(string $location): never {
    http_response_code(302);
    header('Location: ' . $location);
    exit;
}

function esc(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }

function safe_next(mixed $value): string {
    return is_string($value) && preg_match('#^/portal/[A-Za-z0-9/_-]*$#', $value) === 1 ? $value : '/portal/stations';
}

function set_session_cookie(string $id, int $maxAge = SESSION_TTL): void {
    // Max-Age is emitted explicitly (setcookie's array form only knows Expires) to match the Node stand-in.
    $parts = [COOKIE . '=' . $id, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=' . $maxAge];
    if (getenv('COOKIE_SECURE') === '1') $parts[] = 'Secure';
    header('Set-Cookie: ' . implode('; ', $parts), false);
}

function session_file(string $id): ?string {
    global $stateDir;
    return preg_match('/^[a-f0-9-]{36}$/', $id) === 1 ? $stateDir . '/sessions/' . $id . '.json' : null;
}
function current_user(): ?array {
    $id = $_COOKIE[COOKIE] ?? '';
    $file = is_string($id) ? session_file($id) : null;
    if ($file === null || !is_file($file)) return null;
    $entry = json_decode((string) file_get_contents($file), true);
    if (!is_array($entry) || $entry['expiresAt'] <= time()) { @unlink($file); return null; }
    return ['name' => $entry['name'], 'role' => $entry['role']];
}

function uuid4(): string {
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function layout(string $title, string $body): string {
    return '<!DOCTYPE html><html><head><title>' . esc($title) . '</title></head><body bgcolor="#eeeeee">'
        . '<font size="2"><a href="/portal/stations">Stations</a> | <a href="/portal/sessions">Sessions</a> | <a href="/portal/invoices">Invoices</a></font>'
        . '<h2>' . esc($title) . '</h2>' . $body . '<!-- legacy-rendered --></body></html>';
}
function table(array $headers, array $rows): string {
    $head = implode('', array_map(fn($h) => '<th>' . esc($h) . '</th>', $headers));
    $body = implode('', array_map(fn($r) => '<tr>' . implode('', array_map(fn($c) => '<td>' . esc($c) . '</td>', $r)) . '</tr>', $rows));
    return '<table border="1" cellpadding="4"><tr>' . $head . '</tr>' . $body . '</table>';
}

function login_page(string $next, ?string $error = null): string {
    return layout('Login (legacy)',
        ($error ? '<p><font color="red">' . esc($error) . '</font></p>' : '')
        . '<form method="post" action="/login"><input type="hidden" name="next" value="' . esc($next) . '">'
        . '<p><label for="username">User</label> <input id="username" name="username" autocomplete="username"></p>'
        . '<p><label for="password">Password</label> <input id="password" name="password" type="password" autocomplete="current-password"></p>'
        . '<p><input type="submit" value="Log in"></p></form>');
}

function validate_dispute(mixed $input): array {
    $fields = [];
    if (!is_array($input) || !in_array($input['reason'] ?? null, REASONS, true)) $fields['reason'] = 'Bitte wählen Sie einen Grund.';
    $message = is_array($input) && is_string($input['message'] ?? null) ? trim($input['message']) : '';
    $length = mb_strlen($message);
    if ($length < 10) $fields['message'] = 'Bitte beschreiben Sie das Problem mit mindestens 10 Zeichen.';
    elseif ($length > 500) $fields['message'] = 'Bitte höchstens 500 Zeichen.';
    return [$fields, ['reason' => $input['reason'] ?? null, 'message' => $message]];
}

$method = $_SERVER['REQUEST_METHOD'];
$path = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/', '/');
$user = current_user();

if ($path === '/login' && $method === 'GET') {
    $next = safe_next($_GET['next'] ?? null);
    $user ? redirect($next) : respond_html(200, login_page($next));
}

if ($path === '/login' && $method === 'POST') {
    $next = safe_next($_POST['next'] ?? null);
    $users = [['username' => 'demo', 'password' => 'demo-password', 'name' => 'Demo Operator', 'role' => 'operator']];
    $found = null;
    foreach ($users as $u) if (hash_equals(hash('sha256', $u['username']), hash('sha256', (string) ($_POST['username'] ?? '')))) $found = $u;
    // Always compare a password so timing does not reveal whether the user exists.
    $passwordOk = hash_equals(hash('sha256', $found['password'] ?? ''), hash('sha256', (string) ($_POST['password'] ?? '')));
    if ($found === null || !$passwordOk) respond_html(401, login_page($next, 'Invalid user or password'));
    $id = uuid4();
    file_put_contents(session_file($id), json_encode(['name' => $found['name'], 'role' => $found['role'], 'expiresAt' => time() + SESSION_TTL]), LOCK_EX);
    set_session_cookie($id);
    redirect($next);
}

if ($path === '/logout' && $method === 'POST') {
    $id = $_COOKIE[COOKIE] ?? '';
    $file = is_string($id) ? session_file($id) : null;
    if ($file !== null) @unlink($file);
    set_session_cookie('', 0);
    redirect('/login');
}

if ($path === '/__test/reset' && $method === 'POST' && getenv('LEGACY_ALLOW_RESET') === '1') {
    @unlink(invoices_file());
    respond_json(200, ['ok' => true]);
}

if (str_starts_with($path, '/api/')) {
    if (!$user) respond_json(401, ['error' => 'unauthenticated']);
    if ($path === '/api/v1/me') respond_json(200, ['data' => $user]);
    if ($path === '/api/v1/stations') respond_json(200, ['data' => $STATIONS]);
    if ($path === '/api/v1/sessions') respond_json(200, ['data' => $SESSIONS]);
    if ($path === '/api/v1/invoices') respond_json(200, ['data' => load_invoices()]);
    if (preg_match('#^/api/v1/invoices/([A-Za-z0-9-]+)/disputes$#', $path, $m) === 1 && $method === 'POST') {
        // JSON only: a cross-site HTML form cannot send this content type without a CORS preflight.
        if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) respond_json(415, ['error' => 'json_required']);
        $input = json_decode((string) file_get_contents('php://input'), true);
        if ($input === null) respond_json(400, ['error' => 'bad_json']);
        $all = load_invoices();
        $index = array_search($m[1], array_column($all, 'id'), true);
        if ($index === false) respond_json(404, ['error' => 'not_found']);
        if ($all[$index]['status'] !== 'open') respond_json(409, ['error' => 'not_disputable']);
        [$fields, $value] = validate_dispute($input);
        if ($fields) respond_json(422, ['error' => 'validation', 'fields' => $fields]);
        $all[$index]['status'] = 'disputed';
        save_invoices($all);
        respond_json(201, ['data' => ['id' => 'di-' . random_int(1000, 9999), 'invoiceId' => $m[1], 'status' => 'received']]);
    }
    respond_json(404, ['error' => 'not_found']);
}

// Fallback HTML pages (the rollback target, ADR 0005).
$pages = [
    '/portal/stations' => fn() => layout('Stations (legacy)', table(['Name', 'City', 'Status', 'Connectors', 'Max kW'], array_map(fn($s) => [$s['name'], $s['city'], $s['status'], $s['connectors'], $s['maxPowerKw']], $STATIONS))),
    '/portal/sessions' => fn() => layout('Sessions (legacy)', table(['Session', 'Station', 'Started', 'kWh', 'Status'], array_map(fn($s) => [$s['id'], $s['stationId'], $s['startedAt'], $s['energyKwh'], $s['status']], $SESSIONS))),
    '/portal/invoices' => fn() => layout('Invoices (legacy)', table(['Invoice', 'Issued', 'EUR', 'Status'], array_map(fn($i) => [$i['number'], substr($i['issuedAt'], 0, 10), number_format($i['amountCents'] / 100, 2, '.', ''), $i['status']], load_invoices()))),
];
if (isset($pages[$path])) {
    if (!$user) redirect('/login?next=' . rawurlencode($path));
    respond_html(200, $pages[$path]());
}

respond_json(404, ['error' => 'not_found']);
