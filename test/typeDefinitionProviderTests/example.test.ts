import { TypeDefinitionProviderTestBase } from "./typeDefinitionProviderTestBase";

describe("typeResolveDefinition", () => {
  const testBase = new TypeDefinitionProviderTestBase();

  it(`test union constructor resolves when used in a bin op expr`, async () => {
    const source = `
--@ main.elm

type Page =
--X
    Home

func var =
    var == Home
  --^
`;
    await testBase.testDefinition(source);
  });
});
