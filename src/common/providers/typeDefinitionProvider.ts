import { container } from "tsyringe";
import {
  Connection,
  Location,
  LocationLink,
  Position,
  Range,
  TextDocumentPositionParams,
} from "vscode-languageserver";
import { URI } from "vscode-uri";
import { SyntaxNode } from "web-tree-sitter";
import { ElmWorkspaceMatcher } from "../util/elmWorkspaceMatcher";
import { TreeUtils } from "../util/treeUtils";
import { ITextDocumentPositionParams } from "./paramsExtensions";
import { DefinitionResult } from "./definitionProvider";

export class TypeDefinitionProvider {
  private connection: Connection;
  constructor() {
    this.connection = container.resolve<Connection>("Connection");
    this.connection.onDefinition(
      new ElmWorkspaceMatcher((param: TextDocumentPositionParams) =>
        URI.parse(param.textDocument.uri),
      ).handle(this.handleTypeDefinitionRequest.bind(this)),
    );
  }

  protected handleTypeDefinitionRequest = (
    param: ITextDocumentPositionParams,
  ): DefinitionResult => {
    this.connection.console.info(`A type definition was requested`);
    const checker = param.program.getTypeChecker();
    const sourceFile = param.sourceFile;
    if (!sourceFile) return null;

    const nodeAtPosition = TreeUtils.getNamedDescendantForPosition(
      sourceFile.tree.rootNode,
      param.position,
    );

    const definitionNode = checker.findDefinition(
      nodeAtPosition,
      sourceFile,
    ).symbol;
    if (!definitionNode) return null;

    // TODO location from type name
    const typeName = definitionNode.node.type;

    throw new Error("write me");
  };

  private createLocationFromDefinition(
    definitionNode: SyntaxNode | undefined,
    uri: string,
  ): Location | undefined {
    if (definitionNode) {
      return Location.create(
        uri,
        Range.create(
          Position.create(
            definitionNode.startPosition.row,
            definitionNode.startPosition.column,
          ),
          Position.create(
            definitionNode.endPosition.row,
            definitionNode.endPosition.column,
          ),
        ),
      );
    }
  }
}
