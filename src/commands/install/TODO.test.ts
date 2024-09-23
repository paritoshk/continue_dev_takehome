import { constructInstallationPlan } from "./TODO";
import { getPackageInfo } from "../../util/registry";

jest.mock("../../util/registry");

describe("constructInstallationPlan", () => {
  it("should create a correct installation plan for nested dependencies", async () => {
    const mockGetPackageInfo = getPackageInfo as jest.MockedFunction<typeof getPackageInfo>;
    
    mockGetPackageInfo.mockImplementation(async ({ name, version }) => {
      if (name === "package-a" && version === "1.0.0") {
        return {
          name: "package-a",
          version: "1.0.0",
          dependencies: {
            "package-b": "2.0.0",
          },
        };
      } else if (name === "package-b" && version === "2.0.0") {
        return {
          name: "package-b",
          version: "2.0.0",
          dependencies: {
            "package-c": "3.0.0",
          },
        };
      } else if (name === "package-c" && version === "3.0.0") {
        return {
          name: "package-c",
          version: "3.0.0",
          dependencies: {},
        };
      }
      throw new Error(`Unexpected package: ${name}@${version}`);
    });

    const topLevelDependencies = {
      "package-a": "1.0.0",
    };

    const plan = await constructInstallationPlan(topLevelDependencies);

    expect(plan).toEqual([
      { name: "package-a", version: "1.0.0", parentDirectory: ".pnpm/package-a@1.0.0/node_modules/package-a" },
      { name: "package-b", version: "2.0.0", parentDirectory: ".pnpm/package-b@2.0.0/node_modules/package-b" },
      { name: "package-c", version: "3.0.0", parentDirectory: ".pnpm/package-c@3.0.0/node_modules/package-c" },
    ]);
  });
});