import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { api } from "../api";

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  favoritesCount: number;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  animating: boolean;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout>>();
  const inflightToggle = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoggedIn) {
      setFavoriteIds(new Set());
      return;
    }

    setLoading(true);
    api.favorites
      .list()
      .then(({ productIds }) => setFavoriteIds(new Set(productIds)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.has(productId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    (productId: string) => {
      if (!isLoggedIn || inflightToggle.current.has(productId)) return;

      const wasInFavorites = favoriteIds.has(productId);
      const adding = !wasInFavorites;

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (adding) next.add(productId);
        else next.delete(productId);
        return next;
      });

      if (adding) {
        clearTimeout(animationTimer.current);
        setAnimating(true);
        animationTimer.current = setTimeout(() => setAnimating(false), 800);
      }

      inflightToggle.current.add(productId);
      const request = adding
        ? api.favorites.add(productId)
        : api.favorites.remove(productId);

      request
        .catch(() => {
          setFavoriteIds((prev) => {
            const rollback = new Set(prev);
            if (wasInFavorites) rollback.add(productId);
            else rollback.delete(productId);
            return rollback;
          });
        })
        .finally(() => {
          inflightToggle.current.delete(productId);
        });
    },
    [isLoggedIn, favoriteIds]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoritesCount: favoriteIds.size,
        isFavorite,
        toggleFavorite,
        animating,
        loading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx)
    throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
