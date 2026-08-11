import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Accesso · Centrale di Comando",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="etichetta text-taupe mb-2">One Marketing Consulting</p>
          <h1 className="cifra text-bordeaux text-4xl leading-none">
            Centrale di Comando
          </h1>
        </div>
        <div className="bg-card border border-bordo p-7" style={{ borderRadius: 0 }}>
          <LoginForm />
        </div>
        <p className="text-center etichetta text-taupe-chiaro mt-6 text-[0.6rem]">
          Accesso riservato
        </p>
      </div>
    </main>
  );
}
