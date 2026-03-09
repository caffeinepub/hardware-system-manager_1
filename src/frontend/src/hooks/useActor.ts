import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useAdmin } from "../contexts/AdminContext";
import { getSecretParameter } from "../utils/urlParams";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
export function useActor() {
  const { identity } = useInternetIdentity();
  const { role } = useAdmin();
  const queryClient = useQueryClient();

  // Include both identity principal AND role in query key.
  // This ensures the actor is recreated when passkey login/logout happens
  // (even though identity stays undefined for passkey logins).
  const identityKey = identity?.getPrincipal().toString() ?? "anonymous";
  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, identityKey, role ?? "none"],
    queryFn: async () => {
      const isAuthenticated = !!identity;

      if (!isAuthenticated) {
        // Return anonymous actor for passkey logins — backend has no access control guards
        return await createActorWithConfig();
      }

      const actorOptions = {
        agentOptions: {
          identity,
        },
      };

      const actor = await createActorWithConfig(actorOptions);
      const adminToken = getSecretParameter("caffeineAdminToken") || "";
      await actor._initializeAccessControlWithSecret(adminToken);
      return actor;
    },
    // Only refetch when identity or role changes
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  // When the actor changes, invalidate and refetch all dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
