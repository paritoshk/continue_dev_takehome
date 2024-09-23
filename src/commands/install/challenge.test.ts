import { constructInstallationPlan } from "./challenge";
import { getPackageInfo } from "../../util/registry";

jest.mock("../../util/registry");

describe("constructInstallationPlan", () => {
  it("should handle nested dependencies and minimize downloads", async () => {
    const mockGetPackageInfo = getPackageInfo as jest.MockedFunction<typeof getPackageInfo>;
    
    mockGetPackageInfo.mockImplementation(async ({ name, version }) => {
      if (name === "package-a" && version === "1.0.0") {
        return {
          name: "package-a",
          version: "1.0.0",
          dependencies: {
            "shared-dep": "^1.0.0",
          },
        };
      } else if (name === "package-b" && version === "2.0.0") {
        return {
          name: "package-b",
          version: "2.0.0",
          dependencies: {
            "shared-dep": "^2.0.0",
          },
        };
      } else if (name === "shared-dep") {
        if (version === "^1.0.0") {
          return { name: "shared-dep", version: "1.5.0", dependencies: {} };
        } else if (version === "^2.0.0") {
          return { name: "shared-dep", version: "2.1.0", dependencies: {} };
        }
      }
      throw new Error(`Unexpected package: ${name}@${version}`);
    });

    const topLevelDependencies = {
      "package-a": "1.0.0",
      "package-b": "2.0.0",
    };

    const plan = await constructInstallationPlan(topLevelDependencies);

    expect(plan).toEqual([
      { name: "package-a", version: "1.0.0", parentDirectory: ".pnpm/package-a@1.0.0/node_modules/package-a" },
      { name: "package-b", version: "2.0.0", parentDirectory: ".pnpm/package-b@2.0.0/node_modules/package-b" },
      { name: "shared-dep", version: "2.1.0", parentDirectory: ".pnpm/shared-dep@2.1.0/node_modules/shared-dep" },
      { name: "shared-dep", version: "1.5.0", parentDirectory: ".pnpm/package-a@1.0.0/node_modules/shared-dep" },
    ]);
  });
});
