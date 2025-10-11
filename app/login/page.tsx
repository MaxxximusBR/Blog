
export const dynamic = 'force-dynamic';

export default function Login() {
  return (
    <div className="max-w-sm mx-auto card">
      <h1 className="text-xl font-semibold mb-2">Login do Administrador</h1>
      <form action="/api/admin/login" method="post" className="space-y-3 mt-3">
        <input type="hidden" name="redirect" value="/admin" />
        <input type="password" name="password" placeholder="Senha do admin"
          className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" required />
        <input name="code" placeholder="Código 2FA (Authenticator)"
          className="w-full rounded-xl bg-black/30 border border-gray-700 px-3 py-2" required />
        <button className="btn w-full" type="submit">Entrar</button>
      </form>
      <p className="hint mt-3">Use a senha padrão + o código gerado no Google Authenticator.</p>
    </div>
  );
}
