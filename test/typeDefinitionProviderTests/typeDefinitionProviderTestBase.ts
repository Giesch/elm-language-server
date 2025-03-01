import { Location } from "vscode-languageserver";
import { Utils } from "vscode-uri";
import {
  TypeDefinitionProvider,
  DefinitionResult,
} from "../../src/common/providers";
import { ITextDocumentPositionParams } from "../../src/common/providers/paramsExtensions";
import { TreeUtils } from "../../src/common/util/treeUtils";
import { getInvokeAndTargetPositionFromSource } from "../utils/sourceParser";
import { SourceTreeParser, srcUri } from "../utils/sourceTreeParser";

class MockTypeDefinitionProvider extends TypeDefinitionProvider {
  public handleDefinition(
    params: ITextDocumentPositionParams,
  ): DefinitionResult {
    return this.handleTypeDefinitionRequest(params);
  }
}

export class TypeDefinitionProviderTestBase {
  private typeDefinitionProvider: MockTypeDefinitionProvider;
  private treeParser: SourceTreeParser;
  constructor() {
    this.typeDefinitionProvider = new MockTypeDefinitionProvider();
    this.treeParser = new SourceTreeParser();
  }

  public async testDefinition(source: string): Promise<void> {
    await this.treeParser.init();

    const determinedTestType = getInvokeAndTargetPositionFromSource(source);
    const invokeUri = Utils.joinPath(
      srcUri,
      determinedTestType.invokeFile,
    ).toString();

    const program = await this.treeParser.getProgram(
      determinedTestType.sources,
    );
    const sourceFile = program.getSourceFile(invokeUri);

    if (!sourceFile) throw new Error("Getting tree failed");

    switch (determinedTestType.kind) {
      case "unresolved":
        {
          const definition = this.typeDefinitionProvider.handleDefinition({
            textDocument: {
              uri: invokeUri,
            },
            position: determinedTestType.invokePosition,
            program,
            sourceFile,
          });

          expect(definition).toEqual(undefined);
        }
        break;

      case "resolvesToDifferentFile":
        {
          const definition = this.typeDefinitionProvider.handleDefinition({
            textDocument: {
              uri: invokeUri,
            },
            position: determinedTestType.invokePosition,
            program,
            sourceFile,
          });

          expect(definition).toBeDefined();
          expect((definition as Location).uri).toContain(
            determinedTestType.targetFile,
          );

          if (determinedTestType.targetPosition) {
            const targetUri = Utils.joinPath(
              srcUri,
              determinedTestType.targetFile,
            ).toString();

            const rootNode = program.getSourceFile(targetUri)!.tree.rootNode;
            const nodeAtPosition = TreeUtils.getNamedDescendantForPosition(
              rootNode,
              determinedTestType.targetPosition,
            );

            expect((definition as Location).range).toEqual(
              expect.objectContaining({
                start: {
                  line: determinedTestType.targetPosition.line,
                  character: nodeAtPosition.startPosition.column,
                },
                end: {
                  line: expect.any(Number),
                  character: expect.any(Number),
                },
              }),
            );
          }
        }
        break;

      case "resolves":
        {
          const definition = this.typeDefinitionProvider.handleDefinition({
            textDocument: {
              uri: invokeUri,
            },
            position: determinedTestType.invokePosition,
            program,
            sourceFile,
          });

          const rootNode = program.getSourceFile(invokeUri)!.tree.rootNode;
          const nodeAtPosition = TreeUtils.getNamedDescendantForPosition(
            rootNode,
            determinedTestType.targetPosition,
          );

          expect(definition).toEqual(
            expect.objectContaining({
              uri: invokeUri,
              range: {
                start: {
                  line: determinedTestType.targetPosition.line,
                  character: nodeAtPosition.startPosition.column,
                },
                end: {
                  line: expect.any(Number),
                  character: expect.any(Number),
                },
              },
            }),
          );
        }
        break;

      default:
        break;
    }
  }
}
