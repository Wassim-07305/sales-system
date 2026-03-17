import { test, expect } from "@playwright/test";
import { createAnonClient } from "../../helpers/supabase";

test.describe("RLS Validation - client anonyme", () => {
  test("un client anonyme ne peut pas lire la table profiles", async () => {
    const client = createAnonClient();
    const { data, error } = await client.from("profiles").select("*");

    // RLS doit bloquer : soit data vide, soit erreur
    if (error) {
      // Erreur RLS attendue
      expect(error.code).toBeTruthy();
    } else {
      // Data vide car RLS bloque la lecture
      expect(data?.length ?? 0).toBe(0);
    }
  });

  test("un client anonyme ne peut pas lire la table deals", async () => {
    const client = createAnonClient();
    const { data, error } = await client.from("deals").select("*");

    if (error) {
      expect(error.code).toBeTruthy();
    } else {
      expect(data?.length ?? 0).toBe(0);
    }
  });

  test("un client anonyme ne peut pas inserer dans la table deals", async () => {
    const client = createAnonClient();
    const { data, error } = await client.from("deals").insert({
      title: "Deal RLS Test",
      value: 1000,
      stage: "prospect",
    });

    // L'insertion doit echouer
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });

  test("un client anonyme ne peut pas lire la table messages", async () => {
    const client = createAnonClient();
    const { data, error } = await client.from("messages").select("*");

    if (error) {
      expect(error.code).toBeTruthy();
    } else {
      expect(data?.length ?? 0).toBe(0);
    }
  });
});
