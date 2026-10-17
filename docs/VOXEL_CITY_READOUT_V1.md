<!-- Markdown copy of VOXEL CITY READOUT V1.docx (Oct 2026), generated for in-repo reference.
     The .docx / .pdf in the repo root are the source of record; embedded reference images are
     third-party art and are described in text here rather than copied. -->

**VOXEL CITY**

**Feature & Design Brief**

Working design reference · October 2026

**1. Core Vision**

Voxel City is a voxel-styled drag-racing and car-collecting game built around personal expression, a growing garage, vehicle customization, and crew identity.

Racing drives progression, but the game should offer more than just races. Players should have reasons to collect vehicles, tune them, personalize their garages, show off their favorite builds, and compete alongside their crews.

**The player fantasy**

- Collect cars: Discover, earn, and acquire distinctive vehicles with different visual styles and performance characteristics.

- Build a garage: Start small, personalize the space, showcase favorite cars, and eventually expand into additional properties.

- Customize and tune: Change a car's appearance and performance through meaningful upgrade choices.

- Race and progress: Compete in short, repeatable races, advance through leagues, and earn resources to improve your collection.

- Run with a crew: Participate in cooperative and competitive crew activities, with more ambitious social features added over time.

Design north star: The strongest identity is the combination of car collecting, customization, a personal garage, and crew progression. New features should reinforce that core experience.

**How to read this brief**

| **Status**         | **Meaning**                                                  |
|--------------------|--------------------------------------------------------------|
| Agreed direction   | A core decision explicitly chosen by the user.               |
| Current preference | A direction the user likes, but has not finalized.           |
| Proposal           | A suggested feature that still needs discussion or approval. |
| Open question      | A decision to make before treating it as a requirement.      |

**2. Agreed Direction**

**Visual style and platform**

- Voxel/Minecraft-inspired 3D presentation with distinctive vehicles and environments.

- The project has been discussed in a web/Three.js, third-person 3D context.

- Claude Code should inspect the existing repository before making assumptions about architecture, APIs, or implementation.

**Racing modes**

Standard racing — CSR-style shifting

- Launch timing and gear-shift timing form the core skill loop.

- Typing is not required in the standard racing mode.

- Nitrous has been discussed as a possible mechanic, but its inclusion and exact behavior are not finalized.

Optional typing race mode

- A separate mode inspired by Nitro Type.

- Players who enjoy typing races can choose it without forcing typing into the standard racing experience.

Short races

- Races should be quick so players can get back into action.

- Roughly 20–40 seconds was discussed as a possible target, not a finalized duration.

AI-first progression

- Most early races should be against AI.

- AI racing should support story progression and repeatable races that provide a dependable way to earn currency.

- The game should not depend on multiplayer being available to feel complete.

**Multiplayer direction**

1.  Start with asynchronous competition, such as ghost races and recorded race comparisons.

2.  Develop crew and social features as the core game matures.

3.  Introduce live head-to-head multiplayer later.

**Navigation and world access**

- Begin with a menu and garage hub.

- The garage should eventually become a walkable space and a home for the player.

- A larger social city hub is appealing but deferred to the future.

**3. Garage and Player Home**

Status: Current preferences, not all final decisions

The garage should eventually become more than a menu. It should be a personal space where players interact with cars, customize their collection, and express their identity.

**Perspective and progression**

- Support switching between first-person and third-person perspectives in the garage.

- Start with a modest garage and allow players to expand it over time.

- Eventually let players purchase or unlock additional properties with distinct layouts and identities.

**Vehicle storage and showcase**

- Use a hybrid collection model: some cars are physically present in the garage, while overflow vehicles remain in off-site storage or a collection interface.

- Reserve three dedicated showcase positions for the player's favorite vehicles.

- Allow vehicles to move between owned properties without duplicating ownership or losing installed parts and configurations.

**Potential garage features**

These are proposals to explore, not confirmed launch requirements.

- Progression from a humble workshop to a larger workshop, showroom, or estate.

- Parking bays, vehicle lifts, and additional storage.

- A workbench and tuning computer.

- Trophy wall, memorabilia, signage, and collection displays.

- Custom furniture, lighting, flooring, and decorative props.

- Structural expansion modules separate from cosmetic decoration.

- A signature car displayed on the player's profile.

- Photo mode and shareable garage layouts.

- Garage design codes for sharing builds with other players.

- Future player visits with permission controls.

**4. Cars, Customization, and Tuning**

Cars should be recognizable at a glance and offer both visual identity and meaningful performance choices.

**Customization scope**

- Multiple car models with distinctive silhouettes.

- Wheels, decals, liveries, and other visible customization.

- Potentially customizable avatars, with the possibility of reusing appearance assets from the separate Hollowcrown project.

- Hollowcrown asset reuse requires technical compatibility and licensing/ownership checks before it can be committed to the plan.

- Fictional voxel car brands are a sensible starting point to avoid depending on real-world automotive licensing.

**Performance tuning — proposals**

Potential vehicle stats include:

- Horsepower

- Grip

- Drag

- Weight

- Gearing

- Other racing-relevant performance values

Potential upgrade categories include:

- Engine

- Turbocharging or other forced induction

- Tires

- Suspension

- Weight reduction

- Gearing

- Aerodynamics

Additional ideas:

- Visual parts and performance parts could be separate, allowing sleeper builds.

- Upgrades could visibly change cars where practical, such as wider tires, turbo details, exhaust components, or lighter body panels.

- A dyno or build lab could preview performance stats and estimated quarter-mile results.

- Players could save different tuning setups for different stages.

**Vehicle acquisition — open design**

Potential acquisition channels include:

- Dealership purchases

- Story rewards

- Rival rewards

- Rare finds

- Event rewards

The balance between direct purchases, progression unlocks, rare discoveries, and limited-time events remains undecided.

**5. Leagues, Stages, and World**

Status: Proposed progression structure

**Five-league structure**

The proposed ladder is D, C, B, A, and S.

| **League** | **Proposed role**                                |
|------------|--------------------------------------------------|
| D          | Accessible entry point and starter cars          |
| C          | Growing performance and customization options    |
| B          | More competitive racing and deeper tuning        |
| A          | Advanced builds and demanding rivals             |
| S          | Top-end competition and standout vehicle designs |

This structure remains a proposal until explicitly approved.

**Six proposed stages or districts**

> *Reference image (third-party mood-board art, not project assets): POLYGON - Street Racer - Art by Synty*

1\. Harbor Strip

Wet waterfront roads and industrial scenery. Potential focus on grip and surface conditions.

> *Reference image (third-party mood-board art, not project assets): オンラインゲーム『テラビット』にて「秋葉原」を再現したワールドが登場！ 秋葉原体験を世界に！ | サイバーステップ株式会社のプレスリリース*

2\. Downtown Grid

Urban streets providing a relatively neutral baseline for comparing vehicle builds.

> *Reference image (third-party mood-board art, not project assets): Mantis Burn Racing® on Steam*

3\. Quarry Road

Rough terrain and dusty industrial scenery. Potential emphasis on traction and weight.

> *Reference image (third-party mood-board art, not project assets): Make movement increase framerate independent - Blueprint - Epic Developer Community Forums*

4\. Neon Tunnel

A nighttime tunnel route with a distinct atmosphere. Potential emphasis on top speed, gearing, and aerodynamics.

> *Reference image (third-party mood-board art, not project assets): Harvest Kart*

5\. Rooftop Skyway

An elevated urban route with distinctive scenery and possible environmental events.

> *Reference image (third-party mood-board art, not project assets): Unigine Developer*

6\. Oil Fields

Industrial territory potentially associated with the game's proposed corporate antagonist and later progression.

These names and gameplay identities are proposals. The number of stages and their relationship to league progression still need confirmation.

**6. Story, Rivalries, and Crews**

**Voxtown Oil Corpo — proposed antagonist**

One suggested narrative direction introduces Voxtown Oil Corpo as a powerful organization controlling sanctioned leagues.

Possible activities include:

- Challenging corporate enforcers and bosses.

- Progressing through corporate-controlled racing events.

- Crew convoy raids.

- Competing over district ownership or influence.

None of these narrative details should be treated as locked until approved.

**Proposed career story**

1.  Start as an unknown racer.

2.  Build reputation and a garage through racing and vehicle progression.

3.  Join or create a crew.

4.  Eventually challenge the Corpo's influence.

Whether the story is mandatory, optional, episodic, or seasonal remains an open question.

**Proposed crew features**

- Crew name and identity.

- Coordinated vehicle liveries.

- Crew reputation and progression.

- Weekly crew championships.

- Cooperative or competitive crew events.

- A crew garage or shared trophies.

- Optional crew chat and shared resources.

Important unanswered questions include crew size, ranks, permissions, moderation, and whether any assets can be jointly owned.

**7. Economy and Rewards**

Status: Proposed economy model

| **Currency or track** | **Proposed purpose**                                                                | **Status**                                                        |
|-----------------------|-------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| Scrap                 | Earned currency for performance upgrades and basic progression                      | Suggested; not confirmed                                          |
| Crowns                | Premium and earnable currency for cosmetics, garage presets, and decorative options | Crowns were part of the original concept; exact rules remain open |
| Rep                   | Reputation used for league progression or unlocks                                   | Suggested; not confirmed                                          |

**Economy principles to consider**

- Performance upgrades should be earnable through gameplay to avoid pay-to-win advantages.

- Crowns were envisioned as both purchasable and earnable, but their exact uses and balance remain open.

- Repeatable AI races should provide dependable income.

- A player marketplace and crew treasury have been suggested but are not approved.

- Pink-slip wager races have also been suggested, but losing a vehicle could be punishing and would require careful consideration.

The economy should reward racing, collecting, and long-term engagement without making progress dependent on premium purchases.

**8. Community and Future Social Features**

Potential future features include:

- Garage visits and showing off cars to friends.

- Kudos or reactions.

- Shareable car designs and garage layouts.

- Photo mode.

- Community garages.

- Daily, weekly, and seasonal events.

- Ghost races and asynchronous race comparisons.

- Crew competitions and shared progression.

- Live head-to-head racing.

- A larger social city hub.

The social city and live multiplayer should remain future-facing until the single-player racing and collection loop is solid.

**9. Technical and Production Principles for Claude Code**

These principles are intended to guide Claude Code's planning and implementation, not to prescribe unverified APIs or code.

**Repository audit first**

Claude Code should inspect the existing repository, identify what already works, and report architectural risks before proposing substantial changes.

It should not invent files, APIs, or capabilities that are not present.

**Data-driven systems**

Keep core definitions maintainable and separate from game logic where practical:

- Cars

- Parts and upgrades

- Vehicle stats

- League rules

- Stage modifiers

- Economy values

- Rewards and progression rules

**Ownership and presentation**

Vehicle ownership should be stored separately from the 3D object displayed in a garage or race.

This helps prevent duplicate cars and supports moving vehicles between properties while preserving installed parts and tuning configurations.

**Persistence**

The eventual persistence model may need to track:

- Owned vehicles

- Installed parts

- Saved tuning configurations

- Garage and property layouts

- Decorations

- Showcase assignments

**Reusable assets and optimization**

- Build modular garage components and reusable props.

- Load the active property first rather than rendering every owned property.

- Optimize geometry, materials, and decoration density.

- Avoid creating an expensive simulation of the entire world before the core experience requires it.

**Camera and character systems**

First-person and third-person views should share the same underlying player and world state, with attention to collision, camera obstruction, and interaction behavior.

**Multiplayer readiness**

When multiplayer is introduced, race results and rewards will need trusted validation. Player garages will also require appropriate access permissions.

**Small, testable milestones**

Deliver a narrow, functioning slice before expanding into many cars, properties, social systems, or online features.

**10. Suggested Development Sequence**

This is a suggested sequence, not a committed schedule. Claude Code should revise it after auditing the current repository.

**1**

Core vertical slice

Prove the central gameplay loop with one car, one garage, one stage, CSR-style shifting, a few upgrades, an AI opponent, and basic persistence.

**2**

Collection and tuning

Add more cars, upgrade categories, visual parts, tuning, and a basic vehicle acquisition flow.

**3**

Garage-home

Build a walkable garage, first- and third-person switching, three showcase positions, vehicle storage, interactions, and initial decoration.

**4**

Career and world

Develop AI rivals, league progression, stages, approved story content, economy, and repeatable events.

**5**

Crews and online

Add ghost races, crew progression, garage visits, and eventually live multiplayer.

The first milestone should validate the racing feel and progression loop, not attempt to build every system at once.

**11. Open Decisions and Questions**

These can be answered gradually. Not everything needs to be settled before the first playable slice.

**Racing**

- What are the exact race phases: launch, shifts, nitrous, finish, and results?

- Is nitrous a core mechanic, an upgrade, or an optional feature?

- What race duration and number of shifts feel best?

- How should AI difficulty and repeatable rewards scale?

**Cars and progression**

- How many cars are needed for the first playable build?

- Which upgrade types are essential initially?

- How should cars be acquired?

- Are the five leagues and six proposed stages approved, revised, or replaced?

**Garage and avatar**

- What should the starter garage contain?

- What is the first meaningful garage expansion?

- How should the three showcase slots and off-site storage work in the interface?

- Which actions should require walking up to objects rather than using menus?

- Is Hollowcrown asset reuse technically and legally feasible?

**Economy, crews, and story**

- Are Scrap and Rep necessary, or would a simpler economy be better?

- What should Crowns buy, and how should paid versus earned Crowns be balanced?

- Is Voxtown Oil Corpo the chosen antagonist?

- Which crew features are essential for the first release?

- Are wager races, a marketplace, and a crew treasury desirable?

**Technical scope**

- What systems are already implemented and stable?

- What persistence, asset pipeline, and scene architecture already exist?

- What is the smallest end-to-end milestone that can be tested?

- Which technical decisions must be made early to avoid expensive rework?
