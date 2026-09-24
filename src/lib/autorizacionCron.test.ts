import { describe, expect, it } from "vitest";
import { autorizadoPorSecreto } from "./autorizacionCron";

const SECRETO = "el-secreto-del-cron";

describe("autorizadoPorSecreto (S-03, docs/rediseno/46)", () => {
  it("con el secreto correcto, autoriza", () => {
    expect(autorizadoPorSecreto(new Headers({ authorization: `Bearer ${SECRETO}` }), SECRETO)).toBe(true);
  });
  it("con el secreto incorrecto, no autoriza", () => {
    expect(autorizadoPorSecreto(new Headers({ authorization: "Bearer otra-cosa" }), SECRETO)).toBe(false);
  });
  it("sin la variable de entorno configurada, no autoriza aunque la cabecera coincida con una cadena vacía", () => {
    expect(autorizadoPorSecreto(new Headers({ authorization: "Bearer " }), undefined)).toBe(false);
    expect(autorizadoPorSecreto(new Headers(), undefined)).toBe(false);
  });
  it("sin cabecera Authorization, no autoriza", () => {
    expect(autorizadoPorSecreto(new Headers(), SECRETO)).toBe(false);
  });
  it("un secreto que es prefijo del correcto (longitudes distintas) no autoriza", () => {
    expect(autorizadoPorSecreto(new Headers({ authorization: "Bearer el-secreto" }), SECRETO)).toBe(false);
  });
});
