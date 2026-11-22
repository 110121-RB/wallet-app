import { AuthContext } from "@/contexts/authContext";
import { getBudgetsWithProgress } from "@/services/budgetService";
import { BudgetWithProgress } from "@/types";
import { useCallback, useContext, useState } from "react";

export const useBudgets = () => {
  const user = useContext(AuthContext)?.user;
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user?.uid) {
      setBudgets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const result = await getBudgetsWithProgress(user.uid);
    if (result.success) setBudgets(result.data ?? []);
    else setError(result.msg || "Unable to load budgets");
    setLoading(false);
  }, [user?.uid]);

  return { budgets, loading, error, refresh };
};
